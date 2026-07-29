const BASE64URL = /^[A-Za-z0-9_-]+$/;

export function base64UrlToUint8Array(value: string): Uint8Array {
  if (!value || !BASE64URL.test(value) || value.length % 4 === 1) {
    throw new Error("Invalid base64url value");
  }

  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
