import { describe, expect, it } from "vitest";
import { parseVapidConfig } from "./push-config";

const validEnvironment = {
  VAPID_PUBLIC_KEY: "A".repeat(87),
  VAPID_PRIVATE_KEY: "B".repeat(43),
  VAPID_SUBJECT: "mailto:owner@example.com",
};

describe("parseVapidConfig", () => {
  it("parses a complete VAPID configuration", () => {
    expect(parseVapidConfig(validEnvironment)).toEqual({
      publicKey: validEnvironment.VAPID_PUBLIC_KEY,
      privateKey: validEnvironment.VAPID_PRIVATE_KEY,
      subject: validEnvironment.VAPID_SUBJECT,
    });
  });

  it("rejects missing values", () => {
    const { VAPID_PRIVATE_KEY: _privateKey, ...missingPrivateKey } = validEnvironment;
    expect(() => parseVapidConfig(missingPrivateKey)).toThrow(
      "Missing required VAPID environment variable: VAPID_PRIVATE_KEY",
    );
  });

  it("rejects malformed key material", () => {
    expect(() =>
      parseVapidConfig({ ...validEnvironment, VAPID_PUBLIC_KEY: "!" }),
    ).toThrow("VAPID_PUBLIC_KEY must be an unpadded base64url value");
  });

  it("rejects an invalid VAPID subject", () => {
    expect(() =>
      parseVapidConfig({ ...validEnvironment, VAPID_SUBJECT: "owner@example.com" }),
    ).toThrow("VAPID_SUBJECT must be a mailto: or https: URL");
  });
});
