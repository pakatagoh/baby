import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import { readFileSync } from "node:fs";

/** Profile data read from the metadata + weight tabs. */
export interface BabyProfile {
  id: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  dateOfBirth: string; // "YYYY-MM-DD"
  /** imgproxy URL for the baby's profile photo, or null if not set. */
  imageUrl: string | null;
  /** Latest recorded weight in kg, or null if no entries. */
  latestWeightKg: number | null;
  /** ISO 8601 timestamp of the latest weight reading, or null. */
  latestWeightAt: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getSheetsClient(): sheets_v4.Sheets {
  const tokenData = JSON.parse(
    readFileSync(requireEnv("GOOGLE_TOKEN_PATH"), "utf-8"),
  );
  const auth = new google.auth.OAuth2(
    tokenData.client_id,
    tokenData.client_secret,
    tokenData.redirect_uris?.[0],
  );
  auth.setCredentials({
    access_token: tokenData.token,
    refresh_token: tokenData.refresh_token,
  });
  return google.sheets({ version: "v4", auth });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Read baby metadata from the 'metadata' tab. Returns null if no row found. */
async function getMetadata(sheets: sheets_v4.Sheets, sheetId: string) {
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'metadata'!A2:G2",
  });

  const row = result.data.values?.[0];
  if (!row || row.length < 5) return null;

  return {
    id: String(row[0] || ""),
    firstName: String(row[1] || ""),
    lastName: String(row[2] || ""),
    gender: (String(row[3] || "").toLowerCase() === "female" ? "female" : "male") as "male" | "female",
    dateOfBirth: String(row[4] || ""),
    createdAt: String(row[5] || ""),
    imageUrl: String(row[6] || "") || null,
  };
}

/** Read the latest weight entry from the 'weight' tab. Returns null if empty. */
async function getLatestWeight(sheets: sheets_v4.Sheets, sheetId: string) {
  // Read column A to find the last non-empty row
  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'weight'!A:A",
  });
  const rows = colA.data.values || [];
  // Last data row (skip header at row 1)
  if (rows.length <= 1) return null;

  const lastRow = rows.length; // 1-indexed
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'weight'!A${lastRow}:D${lastRow}`,
  });

  const row = result.data.values?.[0];
  if (!row || row.length < 2) return null;

  const weight = parseFloat(String(row[1]));
  if (Number.isNaN(weight)) return null;

  return {
    weightKg: weight,
    createdAt: String(row[2] || ""),
    updatedAt: String(row[3] || ""),
  };
}

/** Fetch the baby profile: metadata + latest weight. */
export async function fetchBabyProfile(): Promise<BabyProfile | null> {
  const sheetId = requireEnv("GOOGLE_SHEET_ID");
  const sheets = getSheetsClient();

  const metadata = await getMetadata(sheets, sheetId);
  if (!metadata) return null;

  const weight = await getLatestWeight(sheets, sheetId);

  return {
    id: metadata.id,
    firstName: metadata.firstName,
    lastName: metadata.lastName,
    gender: metadata.gender,
    dateOfBirth: metadata.dateOfBirth,
    imageUrl: metadata.imageUrl,
    latestWeightKg: weight?.weightKg ?? null,
    latestWeightAt: weight?.createdAt ?? null,
  };
}

/** Write a profile image URL to the metadata tab (column G, row 2). */
export async function updateProfileImage(imageUrl: string): Promise<void> {
  const sheetId = requireEnv("GOOGLE_SHEET_ID");
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "'metadata'!G2",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[imageUrl]],
    },
  });
}
