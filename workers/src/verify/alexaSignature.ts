/**
 * Alexa からのリクエストであることを検証する
 * https://developer.amazon.com/ja-JP/docs/alexa/custom-skills/host-a-custom-skill-as-a-web-service.html
 *
 * 1. SignatureCertChainUrl の形式チェック
 * 2. 証明書チェーンの取得・有効期限・SAN・チェーン内の署名チェック
 * 3. Signature-256 ヘッダーとリクエストボディの署名検証
 * 4. タイムスタンプが150秒以内かチェック
 */
import "reflect-metadata"; // @peculiar/x509 (tsyringe) が要求するため先に読み込む
import * as x509 from "@peculiar/x509";

x509.cryptoProvider.set(crypto);

const CERT_HOST = "s3.amazonaws.com";
const CERT_PATH_PREFIX = "/echo.api/";
const CERT_SAN = "echo-api.amazon.com";
const TIMESTAMP_TOLERANCE_MS = 150 * 1000;
const SIGNATURE_ALGORITHM = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

export class VerificationError extends Error {}

// isolate が生きている間は証明書チェーンを再利用する
const certCache = new Map<string, x509.X509Certificate[]>();

export function isValidCertChainUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  // URL コンストラクタがホストの小文字化と "/../" の正規化を行う
  return (
    url.protocol === "https:" &&
    url.hostname === CERT_HOST &&
    (url.port === "" || url.port === "443") &&
    url.pathname.startsWith(CERT_PATH_PREFIX)
  );
}

export function isValidTimestamp(timestamp: string | undefined, now: Date = new Date()): boolean {
  if (!timestamp) return false;
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return false;
  return Math.abs(now.getTime() - time) <= TIMESTAMP_TOLERANCE_MS;
}

function parsePemChain(pem: string): x509.X509Certificate[] {
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
  if (!blocks) throw new VerificationError("No certificate found in chain");
  return blocks.map((block) => new x509.X509Certificate(block));
}

async function validateCertChain(certs: x509.X509Certificate[], now: Date): Promise<void> {
  const [leaf] = certs;

  const san = leaf.getExtension(x509.SubjectAlternativeNameExtension);
  const hasAlexaSan = san?.names.items.some(
    (name) => name.type === "dns" && name.value === CERT_SAN,
  );
  if (!hasAlexaSan) throw new VerificationError(`Certificate SAN does not include ${CERT_SAN}`);

  for (const [i, cert] of certs.entries()) {
    if (now < cert.notBefore || now > cert.notAfter) {
      throw new VerificationError(`Certificate #${i} is expired or not yet valid`);
    }
    const issuer = certs[i + 1];
    if (!issuer) break;
    const signedByIssuer =
      cert.issuer === issuer.subject &&
      (await cert.verify({ publicKey: issuer.publicKey, signatureOnly: true }));
    if (!signedByIssuer) {
      throw new VerificationError(`Certificate #${i} is not signed by #${i + 1}`);
    }
  }
}

async function getCertChain(certUrl: string, now: Date): Promise<x509.X509Certificate[]> {
  const cached = certCache.get(certUrl);
  if (cached && now <= cached[0].notAfter) return cached;

  const res = await fetch(certUrl);
  if (!res.ok) throw new VerificationError(`Failed to fetch certificate chain: ${res.status}`);

  const certs = parsePemChain(await res.text());
  await validateCertChain(certs, now);
  certCache.set(certUrl, certs);
  return certs;
}

function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export async function verifyAlexaRequest(
  headers: Headers,
  body: string,
  timestamp: string | undefined,
): Promise<void> {
  const now = new Date();

  const certUrl = headers.get("SignatureCertChainUrl");
  const signature = headers.get("Signature-256");
  if (!certUrl || !signature) throw new VerificationError("Missing signature headers");
  if (!isValidCertChainUrl(certUrl)) throw new VerificationError("Invalid SignatureCertChainUrl");

  const [leaf] = await getCertChain(certUrl, now);
  const publicKey = await leaf.publicKey.export(SIGNATURE_ALGORITHM, ["verify"]);

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64ToBytes(signature);
  } catch {
    throw new VerificationError("Signature is not valid base64");
  }
  const isValidSignature = await crypto.subtle.verify(
    SIGNATURE_ALGORITHM,
    publicKey,
    signatureBytes,
    new TextEncoder().encode(body),
  );
  if (!isValidSignature) throw new VerificationError("Invalid request signature");

  if (!isValidTimestamp(timestamp, now)) throw new VerificationError("Request timestamp is too old");
}
