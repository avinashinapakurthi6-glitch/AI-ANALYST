import * as XLSX from 'xlsx';
import { detectPII, anonymizeValue } from './security';

export interface ProcessedData {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  columnCount: number;
  piiColumns: string[];
}

/**
 * Parse CSV content
 */
export function parseCSV(content: string): Record<string, any>[] {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse Excel file
 */
export function parseExcel(buffer: Buffer): Record<string, any>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);
  return rows as Record<string, any>[];
}

/**
 * Clean data: remove duplicates and handle missing values
 */
export function cleanData(rows: Record<string, any>[]): Record<string, any>[] {
  // Remove duplicates
  const seen = new Set<string>();
  const cleaned: Record<string, any>[] = [];

  for (const row of rows) {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(row);
    }
  }

  // Handle missing values
  return cleaned.map(row => {
    const processed: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined || value === '') {
        processed[key] = 'N/A';
      } else {
        processed[key] = value;
      }
    }
    return processed;
  });
}

/**
 * Process uploaded data: parse, clean, detect PII
 */
export function processData(buffer: Buffer, fileType: string): ProcessedData {
  let rows: Record<string, any>[] = [];

  if (fileType === 'csv') {
    rows = parseCSV(buffer.toString('utf-8'));
  } else if (fileType === 'xlsx' || fileType === 'xls') {
    rows = parseExcel(buffer);
  } else {
    throw new Error('Unsupported file type');
  }

  // Clean data
  rows = cleanData(rows);

  // Detect PII
  const piiColumns = new Set<string>();
  for (const row of rows) {
    const detected = detectPII(row);
    detected.forEach(col => piiColumns.add(col));
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    columns,
    rows,
    rowCount: rows.length,
    columnCount: columns.length,
    piiColumns: Array.from(piiColumns),
  };
}

/**
 * Anonymize specific columns in data
 */
export function anonymizeColumns(rows: Record<string, any>[], columnsToAnonymize: string[]): Record<string, any>[] {
  return rows.map(row => {
    const anonymized: Record<string, any> = { ...row };
    for (const column of columnsToAnonymize) {
      if (column in anonymized) {
        anonymized[column] = anonymizeValue(anonymized[column]);
      }
    }
    return anonymized;
  });
}
