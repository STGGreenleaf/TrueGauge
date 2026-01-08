import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import archiver from 'archiver';
import { getCurrentOrgId, getOrCreateSettings } from '@/lib/org';

// Approved export tables - drift test will verify this list
export const APPROVED_EXPORT_TABLES = ['settings', 'dayEntries', 'expenseTransactions', 'referenceMonths', 'cashSnapshots', 'yearStartAnchors', 'cashInjections', 'vendors'] as const;

// Schema version - bump when export shape changes
const SCHEMA_VERSION = 2;

// Helper: escape CSV value
function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper: format value for CSV (null stays empty, not "0" or "null")
function csvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return csvEscape(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();
  return csvEscape(String(value));
}

// Build CSV from array of objects with explicit headers
function buildCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => 
    headers.map(h => csvValue(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    const exportedAtIsoUtc = now.toISOString();

    // Fetch all data for org - raw values only, no computed fields
    const settings = await getOrCreateSettings(orgId);
    const dayEntries = await prisma.dayEntry.findMany({ where: { organizationId: orgId }, orderBy: { date: 'asc' } });
    const expenseTransactions = await prisma.expenseTransaction.findMany({ where: { organizationId: orgId }, orderBy: { date: 'asc' } });
    const referenceMonths = await prisma.referenceMonth.findMany({ where: { organizationId: orgId }, orderBy: [{ year: 'asc' }, { month: 'asc' }] });
    const cashSnapshots = await prisma.cashSnapshot.findMany({ where: { organizationId: orgId }, orderBy: { date: 'desc' } });
    const yearStartAnchors = await prisma.yearStartAnchor.findMany({ where: { organizationId: orgId }, orderBy: { year: 'desc' } });
    const cashInjections = await prisma.cashInjection.findMany({ where: { organizationId: orgId }, orderBy: { date: 'desc' } });
    const vendors = await prisma.vendorTemplate.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } });

    if (format === 'json') {
      // JSON export
      const exportData = {
        meta: {
          schemaVersion: SCHEMA_VERSION,
          exportedAtIsoUtc,
        },
        settings,
        dayEntries,
        expenseTransactions,
        referenceMonths,
        cashSnapshots,
        yearStartAnchors,
        cashInjections,
        vendors,
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="truegauge-backup-${timestamp}.json"`,
        },
      });
    } else if (format === 'csv') {
      // CSV export as ZIP
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      // Collect archive data into buffer
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));

      // Settings CSV (0 or 1 row)
      const settingsHeaders = [
        'id', 'businessName', 'timezone', 'salesInputMode', 
        'targetCogsPct', 'targetFeesPct', 'monthlyFixedNut',
        'nutRent', 'nutUtilities', 'nutPhone', 'nutInternet', 'nutInsurance',
        'nutLoanPayment', 'nutPayroll', 'nutOther1', 'nutOther1Label',
        'nutOther2', 'nutOther2Label', 'nutOther3', 'nutOther3Label',
        'monthlyRoofFund', 'monthlyOwnerDrawGoal', 'openHoursTemplate',
        'storeCloseHour', 'enableTrueHealth', 'enableSpreading',
        'createdAt', 'updatedAt'
      ];
      const settingsRows = settings ? [settings as unknown as Record<string, unknown>] : [];
      archive.append(buildCsv(settingsHeaders, settingsRows), { name: 'settings.csv' });

      // Day entries CSV
      const dayEntriesHeaders = ['id', 'date', 'netSalesExTax', 'notes', 'createdAt', 'updatedAt'];
      archive.append(buildCsv(dayEntriesHeaders, dayEntries as unknown as Record<string, unknown>[]), { name: 'day_entries.csv' });

      // Expense transactions CSV
      const expenseHeaders = ['id', 'date', 'vendorId', 'vendorName', 'category', 'amount', 'memo', 'spreadMonths', 'createdAt'];
      archive.append(buildCsv(expenseHeaders, expenseTransactions as unknown as Record<string, unknown>[]), { name: 'expense_transactions.csv' });

      // Reference months CSV
      const refMonthsHeaders = ['id', 'year', 'month', 'referenceNetSalesExTax', 'note', 'createdAt'];
      archive.append(buildCsv(refMonthsHeaders, referenceMonths as unknown as Record<string, unknown>[]), { name: 'reference_months.csv' });

      // Cash snapshots CSV
      const snapshotHeaders = ['id', 'date', 'amount', 'createdAt'];
      archive.append(buildCsv(snapshotHeaders, cashSnapshots as unknown as Record<string, unknown>[]), { name: 'cash_snapshots.csv' });

      // Year start anchors CSV
      const anchorHeaders = ['id', 'year', 'amount', 'date', 'note', 'createdAt'];
      archive.append(buildCsv(anchorHeaders, yearStartAnchors as unknown as Record<string, unknown>[]), { name: 'year_start_anchors.csv' });

      // Cash injections CSV
      const injectionHeaders = ['id', 'date', 'amount', 'type', 'note', 'createdAt'];
      archive.append(buildCsv(injectionHeaders, cashInjections as unknown as Record<string, unknown>[]), { name: 'cash_injections.csv' });

      // Vendors CSV
      const vendorHeaders = ['id', 'name', 'defaultCategory', 'typicalAmount', 'isRecurring', 'createdAt'];
      archive.append(buildCsv(vendorHeaders, vendors as unknown as Record<string, unknown>[]), { name: 'vendors.csv' });

      // Finalize archive
      await archive.finalize();

      // Wait for all chunks
      await new Promise<void>((resolve, reject) => {
        archive.on('end', resolve);
        archive.on('error', reject);
      });

      const zipBuffer = Buffer.concat(chunks);

      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="truegauge-backup-${timestamp}.zip"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Use ?format=json or ?format=csv' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
