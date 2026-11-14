import "reflect-metadata";
import * as x509 from "@peculiar/x509";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { VerificationError, verifyAlexaRequest } from "../src/verify/alexaSignature";

const ALG = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
  publicExponent: new Uint8Array([1, 0, 1]),
  modulusLength: 2048,
};

async function createChain(san: string) {
  const day = 24 * 60 * 60 * 1000;
  const notBefore = new Date(Date.now() - day);
  const notAfter = new Date(Date.now() + day);

  const rootKeys = (await crypto.subtle.generateKey(ALG, false, ["sign", "verify"])) as CryptoKeyPair;
  const root = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: "01",
    name: "CN=Test Root",
    notBefore,
    notAfter,
    keys: rootKeys,
    signingAlgorithm: ALG,
  });

  const leafKeys = (await crypto.subtle.generateKey(ALG, false, ["sign", "verify"])) as CryptoKeyPair;
  const leaf = await x509.X509CertificateGenerator.create({
    serialNumber: "02",
    subject: `CN=${san}`,
    issuer: root.subject,
    notBefore,
    notAfter,
    publicKey: leafKeys.publicKey,
    signingKey: rootKeys.privateKey,
    signingAlgorithm: ALG,
    extensions: [new x509.SubjectAlternativeNameExtension([{ type: "dns", value: san }])],
  });

  return { pem: `${leaf.toString("pem")}\n${root.toString("pem")}`, leafKeys };
}

async function sign(privateKey: CryptoKey, body: string) {
  const sig = await crypto.subtle.sign(ALG, privateKey, new TextEncoder().encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// 証明書はURLごとにキャッシュされるため、ケースごとに別のURLを使う
let urlCounter = 0;
const nextCertUrl = () => `https://s3.amazonaws.com/echo.api/test-${urlCounter++}.pem`;

function stubCertFetch(pem: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(pem)));
}

describe("verifyAlexaRequest", () => {
  let valid: Awaited<ReturnType<typeof createChain>>;
  const body = JSON.stringify({ request: { type: "LaunchRequest" } });
  const timestamp = () => new Date().toISOString();

  beforeAll(async () => {
    valid = await createChain("echo-api.amazon.com");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a correctly signed request", async () => {
    stubCertFetch(valid.pem);
    const headers = new Headers({
      SignatureCertChainUrl: nextCertUrl(),
      "Signature-256": await sign(valid.leafKeys.privateKey, body),
    });
    await expect(verifyAlexaRequest(headers, body, timestamp())).resolves.toBeUndefined();
  });

  it("rejects a tampered body", async () => {
    stubCertFetch(valid.pem);
    const headers = new Headers({
      SignatureCertChainUrl: nextCertUrl(),
      "Signature-256": await sign(valid.leafKeys.privateKey, body),
    });
    await expect(verifyAlexaRequest(headers, body + " ", timestamp())).rejects.toThrow(
      VerificationError,
    );
  });

  it("rejects a certificate without the Alexa SAN", async () => {
    const other = await createChain("example.com");
    stubCertFetch(other.pem);
    const headers = new Headers({
      SignatureCertChainUrl: nextCertUrl(),
      "Signature-256": await sign(other.leafKeys.privateKey, body),
    });
    await expect(verifyAlexaRequest(headers, body, timestamp())).rejects.toThrow(/SAN/);
  });

  it("rejects an old timestamp", async () => {
    stubCertFetch(valid.pem);
    const headers = new Headers({
      SignatureCertChainUrl: nextCertUrl(),
      "Signature-256": await sign(valid.leafKeys.privateKey, body),
    });
    await expect(verifyAlexaRequest(headers, body, "2020-01-01T00:00:00Z")).rejects.toThrow(
      /timestamp/,
    );
  });

  it("rejects missing headers", async () => {
    await expect(verifyAlexaRequest(new Headers(), body, timestamp())).rejects.toThrow(
      VerificationError,
    );
  });
});
