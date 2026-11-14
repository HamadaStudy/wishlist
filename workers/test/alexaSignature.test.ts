import { describe, expect, it } from "vitest";

import { isValidCertChainUrl, isValidTimestamp } from "../src/verify/alexaSignature";

// 例は Alexa のドキュメント記載のもの
describe("isValidCertChainUrl", () => {
  it.each([
    "https://s3.amazonaws.com/echo.api/echo-api-cert.pem",
    "https://s3.amazonaws.com:443/echo.api/echo-api-cert.pem",
    "https://s3.amazonaws.com/echo.api/../echo.api/echo-api-cert.pem",
    "https://S3.AMAZONAWS.COM/echo.api/echo-api-cert.pem",
  ])("valid: %s", (url) => {
    expect(isValidCertChainUrl(url)).toBe(true);
  });

  it.each([
    "http://s3.amazonaws.com/echo.api/echo-api-cert.pem",
    "https://notamazon.com/echo.api/echo-api-cert.pem",
    "https://s3.amazonaws.com/EcHo.aPi/echo-api-cert.pem",
    "https://s3.amazonaws.com/invalid.path/echo-api-cert.pem",
    "https://s3.amazonaws.com:563/echo.api/echo-api-cert.pem",
    "not a url",
  ])("invalid: %s", (url) => {
    expect(isValidCertChainUrl(url)).toBe(false);
  });
});

describe("isValidTimestamp", () => {
  const now = new Date("2026-11-14T00:00:00Z");

  it("accepts timestamps within 150 seconds", () => {
    expect(isValidTimestamp("2026-11-13T23:57:31Z", now)).toBe(true);
  });

  it("rejects timestamps older than 150 seconds", () => {
    expect(isValidTimestamp("2026-11-13T23:57:29Z", now)).toBe(false);
  });

  it.each([undefined, "", "invalid"])("rejects %j", (timestamp) => {
    expect(isValidTimestamp(timestamp, now)).toBe(false);
  });
});
