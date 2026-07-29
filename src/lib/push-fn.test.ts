import { describe, expect, it } from "vitest";
import { publicVapidKeyResponse } from "./push-fn";

describe("publicVapidKeyResponse", () => {
  it("returns exactly the public VAPID key field", () => {
    expect(publicVapidKeyResponse("public-key")).toEqual({
      vapidPublicKey: "public-key",
    });
  });

  it("does not include private configuration fields", () => {
    const response = publicVapidKeyResponse("public-key");
    expect(Object.keys(response)).toEqual(["vapidPublicKey"]);
    expect(response).not.toHaveProperty("vapidPrivateKey");
    expect(response).not.toHaveProperty("vapidSubject");
  });
});
