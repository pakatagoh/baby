import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import { readFileSync } from "node:fs";
import { currentSgtISO } from "./frozen-date";

// ─── Helpers ────────────────────────────────────────────────────────────────

const sgtISO = currentSgtISO;

// ─── Abstract storage interface ─────────────────────────────────────────────

export interface MilkSheetEntry {
  rowIndex?: number;
  id: string;
  frozenAt: string;
  amount: number;
  packets: number; // 1 (always 1 after "unrolling" multi-packet rows)
  totalFrozen: number; // 0
  totalUsed: number; // 0
  notes: string; // "" or handwritten note
  imageUrl: string; // imgproxy URL
  /** Pre-computed srcset for 64×64 thumbnails (server-enriched). */
  srcSetThumb?: string;
  /** Pre-computed srcset for modal lightbox (server-enriched). */
  srcSetLightbox?: string;
  // ── Metadata columns (I-L) ──────────────────────────────────────────
  /** ISO 8601 timestamp — when this row was first created. */
  createdAt: string;
  /** ISO 8601 timestamp — when this row was last modified (empty if never). */
  updatedAt: string;
  /** Checkbox — TRUE when this packet has been consumed. */
  used: boolean;
  /** ISO 8601 timestamp — when the packet was marked used (empty if not). */
  usedAt: string;
}

export interface MilkStorageBackend {
  append(entry: MilkSheetEntry): Promise<{ rowIndex: number; id: string }>;
  getLatest(): Promise<MilkSheetEntry | null>;
  getAll(): Promise<MilkSheetEntry[]>;
  update(rowIndex: number, fields: Partial<MilkSheetEntry>): Promise<void>;
  delete(rowIndex: number): Promise<void>;
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
  // Cache the sheet's internal ID (looked up once from spreadsheet metadata).
  private _sheetId: number | null = null;

  private async getSheetId(): Promise<number> {
    if (this._sheetId !== null) return this._sheetId;
    const sheetId = requireEnv("GOOGLE_SHEET_ID");
    const tab = requireEnv("GOOGLE_SHEET_TAB");
    const sheets = getSheetsClient();
    const ss = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    for (const sheet of ss.data.sheets ?? []) {
      if (sheet.properties?.title === tab) {
        this._sheetId = sheet.properties.sheetId!;
        return this._sheetId;
      }
    }
    throw new Error(`Sheet tab "${tab}" not found`);
  }

  async append(entry: MilkSheetEntry): Promise<{ rowIndex: number; id: string }> {
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
    const id = crypto.randomUUID();

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${nextRow}:L${nextRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            entry.frozenAt || "",
            entry.amount,
            1, // always 1 packet per row
            `=C${nextRow}-E${nextRow}`, // total frozen = packets - total used
            entry.totalUsed,
            entry.notes,
            entry.imageUrl,
            id,
            // Metadata columns (I-L)
            `'${entry.createdAt || sgtISO()}`,
            "", // updatedAt
            false, // used checkbox
            "", // usedAt
          ],
        ],
      },
    });

    return { rowIndex: nextRow, id };
  }

  async getLatest(): Promise<MilkSheetEntry | null> {
    const sheetId = requireEnv("GOOGLE_SHEET_ID");
    const tab = requireEnv("GOOGLE_SHEET_TAB");
    const sheets = getSheetsClient();

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${HEADER_ROW + 1}:L`,
    });

    const rows = result.data.values || [];
    const lastOffset = rows.findLastIndex(
      (row) => String(row?.[0] ?? "").trim() !== "",
    );
    if (lastOffset === -1) return null;

    const lastRow = rows[lastOffset];
    if (!lastRow || lastRow.length < 2) return null;

    const rowIndex = HEADER_ROW + 1 + lastOffset;
    return {
      rowIndex,
      frozenAt: String(lastRow[0] || ""),
      amount: Number(lastRow[1]) || 0,
      packets: Number(lastRow[2]) || 0,
      totalFrozen: Number(lastRow[3]) || 0,
      totalUsed: Number(lastRow[4]) || 0,
      notes: String(lastRow[5] || ""),
      imageUrl: String(lastRow[6] || ""),
      id: String(lastRow[7] || ""),
      createdAt: String(lastRow[8] || "").replace(/^'/, ""),
      updatedAt: String(lastRow[9] || "").replace(/^'/, ""),
      used: String(lastRow[10] || "").toUpperCase() === "TRUE",
      usedAt: String(lastRow[11] || "").replace(/^'/, ""),
    };
  }

  async getAll(): Promise<MilkSheetEntry[]> {
    const sheetId = requireEnv("GOOGLE_SHEET_ID");
    const tab = requireEnv("GOOGLE_SHEET_TAB");
    const sheets = getSheetsClient();

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${HEADER_ROW + 1}:L`,
    });

    const rows = result.data.values || [];
    const entries: MilkSheetEntry[] = [];
    for (const [i, row] of rows.entries()) {
      if (!row || row.length < 2) continue;
      // Skip empty rows.
      if (!row[0] || String(row[0]).trim() === "") continue;
      entries.push({
        rowIndex: HEADER_ROW + 1 + i,
        frozenAt: String(row[0] || ""), // A
        amount: Number(row[1]) || 0, // B
        packets: Number(row[2]) || 0, // C
        totalFrozen: Number(row[3]) || 0, // D
        totalUsed: Number(row[4]) || 0, // E
        notes: String(row[5] || ""), // F
        imageUrl: String(row[6] || ""), // G
        id: String(row[7] || ""), // H
        createdAt: String(row[8] || "").replace(/^'/, ""), // I
        updatedAt: String(row[9] || "").replace(/^'/, ""), // J
        used: String(row[10] || "").toUpperCase() === "TRUE", // K
        usedAt: String(row[11] || "").replace(/^'/, ""), // L
      });
    }
    return entries;
  }

  async update(
    rowIndex: number,
    fields: Partial<MilkSheetEntry>,
  ): Promise<void> {
    const sheetId = requireEnv("GOOGLE_SHEET_ID");
    const tab = requireEnv("GOOGLE_SHEET_TAB");
    const sheets = getSheetsClient();

    // Read the existing row so we only overwrite changed columns.
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${rowIndex}:L${rowIndex}`,
    });
    const values = existing.data.values?.[0] ?? [];

    const frozenAt = fields.frozenAt ?? values[0]; // A
    const amount = fields.amount ?? values[1]; // B
    const packets = 1; // C — always one packet per unrolled row
    const totalFrozen = `=C${rowIndex}-E${rowIndex}`; // D
    const totalUsed = fields.totalUsed ?? values[4]; // E
    const notes = fields.notes ?? values[5]; // F
    const imageUrl = fields.imageUrl ?? values[6]; // G
    const id = values[7]; // H — never mutated
    const createdAt = fields.createdAt !== undefined // I
      ? `'${fields.createdAt}`
      : values[8];
    const updatedAt = `'${sgtISO()}`; // J
    const used = fields.used !== undefined ? fields.used : values[10]; // K
    const usedAt = fields.usedAt !== undefined // L
      ? (fields.usedAt ? `'${fields.usedAt}` : "")
      : values[11];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${rowIndex}:L${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          frozenAt, amount, packets, totalFrozen, totalUsed, notes,
          imageUrl, id, createdAt, updatedAt, used, usedAt,
        ]],
      },
    });
  }
  async delete(rowIndex: number): Promise<void> {
    const sheetId = requireEnv("GOOGLE_SHEET_ID");
    const tabSheetId = await this.getSheetId();
    const sheets = getSheetsClient();

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: tabSheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-based
                endIndex: rowIndex,       // exclusive
              },
            },
          },
        ],
      },
    });
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

export async function appendToSheet(entry: MilkSheetEntry): Promise<{ rowIndex: number; id: string }> {
  return backend.append(entry);
}

export async function getLatestEntry(): Promise<MilkSheetEntry | null> {
  return backend.getLatest();
}

export async function getAllEntries(): Promise<MilkSheetEntry[]> {
  return backend.getAll();
}

export async function updateEntry(
  rowIndex: number,
  fields: Partial<MilkSheetEntry>,
): Promise<void> {
  return backend.update(rowIndex, fields);
}

export async function deleteEntry(rowIndex: number): Promise<void> {
  return backend.delete(rowIndex);
}
