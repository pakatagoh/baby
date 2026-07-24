import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
import { readFileSync } from "node:fs";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Current time as ISO 8601 in SGT (+08:00), matching the Python scripts. */
function sgtISO(): string {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return now.toISOString().replace("Z", "+08:00");
}

// ─── Abstract storage interface ─────────────────────────────────────────────

export interface MilkSheetEntry {
  rowIndex?: number; // 1-based row in the sheet (set when reading from sheet)
  id: string; // UUID v4 — stable unique identifier
  /** @deprecated Use frozenAt instead. Kept for backward compat during migration. */
  date: string; // "15-Jul-26"
  /** @deprecated Use frozenAt instead. Kept for backward compat during migration. */
  time: string; // "19:30"
  /** ISO 8601 datetime in SGT (+08:00) — when the milk was frozen. */
  frozenAt: string;
  amount: number; // 80
  packets: number; // 1 (always 1 after "unrolling" multi-packet rows)
  totalFrozen: number; // 0
  totalUsed: number; // 0
  notes: string; // "" or handwritten note
  imageUrl: string; // imgproxy URL
  /** Pre-computed srcset for 64×64 thumbnails (server-enriched). */
  srcSetThumb?: string;
  /** Pre-computed srcset for modal lightbox (server-enriched). */
  srcSetLightbox?: string;
  // ── Metadata columns (K-N) ──────────────────────────────────────────
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
      range: `'${tab}'!A${nextRow}:N${nextRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            `'${entry.date || ""}`,
            `'${entry.time || ""}`,
            entry.frozenAt || "",
            entry.amount,
            1, // always 1 packet per row
            // Total frozen = packets - total used (formula, not static value)
            `=E${nextRow}-G${nextRow}`,
            entry.totalUsed,
            entry.notes,
            entry.imageUrl,
            id,
            // Metadata columns (K-N)
            `'${entry.createdAt || sgtISO()}`, // createdAt (caller's value or now)
            "", // updatedAt (empty until row is modified)
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
      range: `'${tab}'!A${HEADER_ROW + 1}:N`,
    });

    const rows = result.data.values || [];
    if (rows.length === 0) return null;

    const lastRow = rows[rows.length - 1];
    if (!lastRow || lastRow.length < 4) return null;

    const rowIndex = HEADER_ROW + rows.length; // last data row
    const date = String(lastRow[0] || "").replace(/^'/, "");
    const time = String(lastRow[1] || "").replace(/^'/, "");

    return {
      rowIndex,
      id: String(lastRow[9] || ""),
      date,
      time,
      frozenAt: String(lastRow[2] || ""),
      amount: Number(lastRow[3]) || 0,
      packets: Number(lastRow[4]) || 0,
      totalFrozen: Number(lastRow[5]) || 0,
      totalUsed: Number(lastRow[6]) || 0,
      notes: String(lastRow[7] || ""),
      imageUrl: String(lastRow[8] || ""),
      createdAt: String(lastRow[10] || "").replace(/^'/, ""),
      updatedAt: String(lastRow[11] || "").replace(/^'/, ""),
      used: String(lastRow[12] || "").toUpperCase() === "TRUE",
      usedAt: String(lastRow[13] || "").replace(/^'/, ""),
    };
  }

  async getAll(): Promise<MilkSheetEntry[]> {
    const sheetId = requireEnv("GOOGLE_SHEET_ID");
    const tab = requireEnv("GOOGLE_SHEET_TAB");
    const sheets = getSheetsClient();

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${HEADER_ROW + 1}:N`,
    });

    const rows = result.data.values || [];
    const entries: MilkSheetEntry[] = [];
    for (const [i, row] of rows.entries()) {
      if (!row || row.length < 4) continue;
      // Skip rows with no date — empty rows or checkbox-only rows
      if (!row[0] || String(row[0]).trim() === "") continue;
      entries.push({
        rowIndex: HEADER_ROW + 1 + i, // row 2, 3, 4, ...
        id: String(row[9] || ""),       // J
        date: String(row[0] || "").replace(/^'/, ""),  // A — deprecated
        time: String(row[1] || "").replace(/^'/, ""),  // B — deprecated
        frozenAt: String(row[2] || ""), // C
        amount: Number(row[3]) || 0,    // D
        packets: Number(row[4]) || 0,   // E
        totalFrozen: Number(row[5]) || 0, // F
        totalUsed: Number(row[6]) || 0,   // G
        notes: String(row[7] || ""),      // H
        imageUrl: String(row[8] || ""),   // I
        createdAt: String(row[10] || "").replace(/^'/, ""), // K
        updatedAt: String(row[11] || "").replace(/^'/, ""), // L
        used: String(row[12] || "").toUpperCase() === "TRUE", // M
        usedAt: String(row[13] || "").replace(/^'/, ""),      // N
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

    // Read the existing row so we only overwrite changed columns
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${rowIndex}:N${rowIndex}`,
    });
    const values = existing.data.values?.[0] ?? [];
    // Preserve existing values for columns we don't overwrite
    const date = fields.date !== undefined ? `'${fields.date}` : values[0];     // A
    const time = fields.time !== undefined ? `'${fields.time}` : values[1];     // B
    const frozenAt = fields.frozenAt ?? values[2];                              // C
    const amount = fields.amount ?? values[3];                                  // D
    const packets = 1; // always 1 after unrolling                               // E
    // Total frozen = packets - total used (always a formula)
    const totalFrozen = `=E${rowIndex}-G${rowIndex}`;
    const totalUsed = fields.totalUsed ?? values[6];                            // G
    const notes = fields.notes ?? values[7];                                    // H
    const imageUrl = fields.imageUrl ?? values[8];                              // I
    const id = values[9]; // never mutated on update                             // J
    // Metadata columns — preserve existing unless explicitly provided
    const createdAt = fields.createdAt !== undefined                             // K
      ? `'${fields.createdAt}` : values[10];
    const updatedAt = `'${sgtISO()}`; // always touch on update                 // L
    const used = fields.used !== undefined ? fields.used : values[12];           // M
    const usedAt = fields.usedAt !== undefined                                   // N
      ? (fields.usedAt ? `'${fields.usedAt}` : "")
      : values[13];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `'${tab}'!A${rowIndex}:N${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [date, time, frozenAt, amount, packets, totalFrozen, totalUsed, notes, imageUrl, id,
           createdAt, updatedAt, used, usedAt],
        ],
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
