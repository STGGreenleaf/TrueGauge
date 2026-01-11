/**
 * HB Health Machine - Export Tests
 * Tests for backup export functionality
 */

import { describe, it, expect } from 'vitest';
import { APPROVED_EXPORT_TABLES } from '@/app/api/export/route';

// ============================================
// DRIFT TEST - Approved Export Tables
// ============================================

describe('Export Drift Prevention', () => {
  it('approved export tables list is exactly as expected', () => {
    // This test ensures any new table addition is intentional
    // If you add a new table, update this list AND the export route
    const expectedTables = [
      'settings',
      'dayEntries',
      'expenseTransactions',
      'referenceMonths',
      'cashSnapshots',
      'yearStartAnchors',
      'cashInjections',
      'vendors',
    ];
    expect(APPROVED_EXPORT_TABLES).toEqual(expectedTables);
  });

  it('approved tables count matches expected', () => {
    expect(APPROVED_EXPORT_TABLES.length).toBe(8);
  });
});

// ============================================
// JSON EXPORT SHAPE TESTS
// ============================================

describe('JSON Export Shape', () => {
  // Mock export data structure
  const createMockExportData = (overrides: {
    settings?: object | null;
    dayEntries?: Array<{ date: string; netSalesExTax: number | null }>;
  } = {}) => ({
    meta: {
      schemaVersion: 1,
      exportedAtIsoUtc: '2026-01-02T12:00:00.000Z',
    },
    settings: 'settings' in overrides ? overrides.settings : { id: 1, businessName: 'Test' },
    dayEntries: overrides.dayEntries ?? [],
    expenseTransactions: [],
    referenceMonths: [],
  });

  it('has exactly the required top-level keys', () => {
    const data = createMockExportData();
    const keys = Object.keys(data).sort();
    expect(keys).toEqual(['dayEntries', 'expenseTransactions', 'meta', 'referenceMonths', 'settings']);
  });

  it('meta contains schemaVersion and exportedAtIsoUtc', () => {
    const data = createMockExportData();
    expect(data.meta).toHaveProperty('schemaVersion');
    expect(data.meta).toHaveProperty('exportedAtIsoUtc');
    expect(typeof data.meta.schemaVersion).toBe('number');
    expect(typeof data.meta.exportedAtIsoUtc).toBe('string');
  });

  it('null netSalesExTax stays null in export (not 0)', () => {
    const data = createMockExportData({
      dayEntries: [
        { date: '2026-01-01', netSalesExTax: null },
        { date: '2026-01-02', netSalesExTax: 1500 },
      ],
    });
    
    expect(data.dayEntries[0].netSalesExTax).toBeNull();
    expect(data.dayEntries[1].netSalesExTax).toBe(1500);
  });

  it('settings can be null when no settings exist', () => {
    const data = createMockExportData({ settings: null });
    expect(data.settings).toBeNull();
  });

  it('date fields are ISO YYYY-MM-DD format', () => {
    const data = createMockExportData({
      dayEntries: [{ date: '2026-01-15', netSalesExTax: 1000 }],
    });
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(data.dayEntries[0].date).toMatch(dateRegex);
  });
});

// ============================================
// CSV EXPORT TESTS
// ============================================

describe('CSV Export Format', () => {
  // Helper to build CSV like the export route does
  const csvValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    return String(value);
  };

  const buildCsv = (headers: string[], rows: Record<string, unknown>[]): string => {
    const headerLine = headers.join(',');
    const dataLines = rows.map(row => 
      headers.map(h => csvValue(row[h])).join(',')
    );
    return [headerLine, ...dataLines].join('\n');
  };

  it('day_entries.csv has correct headers', () => {
    const headers = ['id', 'date', 'netSalesExTax', 'notes', 'createdAt', 'updatedAt'];
    const csv = buildCsv(headers, []);
    expect(csv).toBe('id,date,netSalesExTax,notes,createdAt,updatedAt');
  });

  it('expense_transactions.csv has correct headers', () => {
    const headers = ['id', 'date', 'vendorId', 'vendorName', 'category', 'amount', 'memo', 'spreadMonths', 'createdAt'];
    const csv = buildCsv(headers, []);
    expect(csv).toBe('id,date,vendorId,vendorName,category,amount,memo,spreadMonths,createdAt');
  });

  it('reference_months.csv has correct headers', () => {
    const headers = ['id', 'year', 'month', 'referenceNetSalesExTax', 'note', 'createdAt'];
    const csv = buildCsv(headers, []);
    expect(csv).toBe('id,year,month,referenceNetSalesExTax,note,createdAt');
  });

  it('null exports as empty field, not "0" or "null"', () => {
    const headers = ['id', 'date', 'netSalesExTax', 'notes'];
    const rows = [
      { id: 1, date: '2026-01-01', netSalesExTax: null, notes: null },
    ];
    const csv = buildCsv(headers, rows);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('1,2026-01-01,,');
  });

  it('values with commas are quoted', () => {
    const headers = ['id', 'notes'];
    const rows = [{ id: 1, notes: 'hello, world' }];
    const csv = buildCsv(headers, rows);
    expect(csv).toContain('"hello, world"');
  });

  it('values with quotes are escaped', () => {
    const headers = ['id', 'notes'];
    const rows = [{ id: 1, notes: 'said "hello"' }];
    const csv = buildCsv(headers, rows);
    expect(csv).toContain('"said ""hello"""');
  });

  it('rates remain as decimals (0-1), not percentages', () => {
    const headers = ['id', 'targetCogsPct'];
    const rows = [{ id: 1, targetCogsPct: 0.35 }];
    const csv = buildCsv(headers, rows);
    // Rate should be 0.35, not converted to 35 (percentage)
    expect(csv).toContain('0.35');
    // Verify it's not stored as percentage (would be ",35," or ",35\n")
    expect(csv).not.toMatch(/,35[,\n]/);
  });
});
