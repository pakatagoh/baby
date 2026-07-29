export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

type Environment = Readonly<Record<string, string | undefined>>;

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function required(environment: Environment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`Missing required VAPID environment variable: ${name}`);
  }
  return value;
}

function validateKey(value: string, name: string, expectedBytes: number): string {
  if (!BASE64URL.test(value)) {
    throw new Error(`${name} must be an unpadded base64url value`);
  }

  const decodedLength = Math.floor((value.length * 6) / 8);
  if (decodedLength !== expectedBytes) {
    throw new Error(`${name} must decode to ${expectedBytes} bytes`);
  }

  return value;
}

function validateSubject(subject: string): string {
  try {
    const url = new URL(subject);
    if (url.protocol !== "mailto:" && url.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("VAPID_SUBJECT must be a mailto: or https: URL");
  }
  return subject;
}

/**
 * Parse server runtime configuration. Keep this module server-only: it
 * contains the VAPID private key accessor and must never be imported by a
 * client component.
 */
export function parseVapidConfig(environment: Environment): VapidConfig {
  return {
    publicKey: validateKey(required(environment, "VAPID_PUBLIC_KEY"), "VAPID_PUBLIC_KEY", 65),
    privateKey: validateKey(required(environment, "VAPID_PRIVATE_KEY"), "VAPID_PRIVATE_KEY", 32),
    subject: validateSubject(required(environment, "VAPID_SUBJECT")),
  };
}

export function getVapidConfig(): VapidConfig {
  return parseVapidConfig(process.env);
}

export function getVapidPublicKey(): string {
  return getVapidConfig().publicKey;
}
