import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import { readFileSync } from "node:fs";

// ─── Abstract storage interface ─────────────────────────────────────────────

export interface MilkSheetEntry {
  date: string; // "15-Jul-26"
  time: string; // "19:30"
  amount: number; // 80
  packets: number; // 2
  notes: string; // "" or handwritten note
  imageUrl: string; // imgproxy URL
}

export interface MilkStorageBackend {
  append(entry: MilkSheetEntry): Promise<number>;
  getLatest(): Promise<MilkSheetEntry | null>;
}

// ─── Google Sheets implementation ───────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Spreadsheet ID, tab name, and OAuth token location are read from the
// environment per request (never at module scope) so nothing identifying is
// committed and values resolve at request time. See:
// https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables
const HEADER_ROW = 1;

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

export class GoogleSheetsBackend implements MilkStorageBackend {
  async append(entry: MilkSheetEntry): Promise<number> {
    const sheetId = requireEnv("GOOGLE_SHEET_ID");
    const tab = requireEnv("GOOGLE_SHEET_TAB");
    const sheets = getSheetsClient();

    const colAResult = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A:A`,
    });

    const values = colAResult.data.values || [];
    const lastRow = values.length;
    const nextRow = lastRow + 1;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${nextRow}:G${nextRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            `'${entry.date}`,
            `'${entry.time}`,
            entry.amount,
            entry.packets,
            "Frozen",
            entry.notes,
            entry.imageUrl,
          ],
        ],
      },
    });

    return nextRow;
  }

  async getLatest(): Promise<MilkSheetEntry | null> {
    const sheetId = requireEnv("GOOGLE_SHEET_ID");
    const tab = requireEnv("GOOGLE_SHEET_TAB");
    const sheets = getSheetsClient();

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${HEADER_ROW + 1}:G`,
    });

    const rows = result.data.values || [];
    if (rows.length === 0) return null;

    const lastRow = rows[rows.length - 1];
    if (!lastRow || lastRow.length < 4) return null;

    const date = String(lastRow[0] || "").replace(/^'/, "");
    const time = String(lastRow[1] || "").replace(/^'/, "");

    return {
      date,
      time,
      amount: Number(lastRow[2]) || 0,
      packets: Number(lastRow[3]) || 0,
      notes: String(lastRow[5] || ""),
      imageUrl: String(lastRow[6] || ""),
    };
  }
}

// ─── Singleton backend (swap out for testing / future migration) ────────────

let backend: MilkStorageBackend = new GoogleSheetsBackend();

export function setStorageBackend(b: MilkStorageBackend): void {
  backend = b;
}

export function getStorageBackend(): MilkStorageBackend {
  return backend;
}

// ─── Convenience exports used by the upload handler ────────────────────────────

export async function appendToSheet(entry: MilkSheetEntry): Promise<number> {
  return backend.append(entry);
}

export async function getLatestEntry(): Promise<MilkSheetEntry | null> {
  return backend.getLatest();
}
