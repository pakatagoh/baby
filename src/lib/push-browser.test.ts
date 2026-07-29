import { describe, expect, it } from "vitest";
import { base64UrlToUint8Array } from "./push-browser";

describe("base64UrlToUint8Array", () => {
  it("decodes an unpadded base64url VAPID key", () => {
    expect(Array.from(base64UrlToUint8Array("AQIDBA"))).toEqual([1, 2, 3, 4]);
  });

  it("rejects malformed base64url input", () => {
    expect(() => base64UrlToUint8Array("not valid!")).toThrow("Invalid base64url value");
  });
});
