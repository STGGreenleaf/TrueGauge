import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentOrgId, assertNotShowcase } from '@/lib/org';

// Import a JSON backup and populate the organization
export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    assertNotShowcase(orgId);

    const body = await request.json();
    const { data, wipeFirst } = body;

    if (!data || !data.meta) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Validate schema version
    if (data.meta.schemaVersion > 2) {
      return NextResponse.json({ error: 'Backup file is from a newer version. Please update TrueGauge.' }, { status: 400 });
    }

    // If wipeFirst is true, delete all existing data for this org
    if (wipeFirst) {
      await prisma.$transaction([
        prisma.cashSnapshot.deleteMany({ where: { organizationId: orgId } }),
        prisma.yearStartAnchor.deleteMany({ where: { organizationId: orgId } }),
        prisma.cashInjection.deleteMany({ where: { organizationId: orgId } }),
        prisma.expenseTransaction.deleteMany({ where: { organizationId: orgId } }),
        prisma.dayEntry.deleteMany({ where: { organizationId: orgId } }),
        prisma.referenceMonth.deleteMany({ where: { organizationId: orgId } }),
        prisma.vendorTemplate.deleteMany({ where: { organizationId: orgId } }),
      ]);
    }

    const results = {
      settings: false,
      dayEntries: 0,
      expenseTransactions: 0,
      referenceMonths: 0,
      cashSnapshots: 0,
      yearStartAnchors: 0,
      cashInjections: 0,
      vendors: 0,
    };

    // Import settings (upsert)
    if (data.settings) {
      const { id, organizationId, createdAt, updatedAt, ...settingsData } = data.settings;
      await prisma.settings.upsert({
        where: { organizationId: orgId },
        update: settingsData,
        create: { organizationId: orgId, ...settingsData },
      });
      results.settings = true;
    }

    // Import day entries
    if (data.dayEntries && Array.isArray(data.dayEntries)) {
      for (const entry of data.dayEntries) {
        const { id, organizationId, createdAt, updatedAt, ...entryData } = entry;
        await prisma.dayEntry.upsert({
          where: { organizationId_date: { organizationId: orgId, date: entryData.date } },
          update: entryData,
          create: { organizationId: orgId, ...entryData },
        });
        results.dayEntries++;
      }
    }

    // Import reference months
    if (data.referenceMonths && Array.isArray(data.referenceMonths)) {
      for (const ref of data.referenceMonths) {
        const { id, organizationId, createdAt, ...refData } = ref;
        await prisma.referenceMonth.upsert({
          where: { organizationId_year_month: { organizationId: orgId, year: refData.year, month: refData.month } },
          update: refData,
          create: { organizationId: orgId, ...refData },
        });
        results.referenceMonths++;
      }
    }

    // Import cash snapshots
    if (data.cashSnapshots && Array.isArray(data.cashSnapshots)) {
      for (const snap of data.cashSnapshots) {
        const { id, organizationId, createdAt, ...snapData } = snap;
        await prisma.cashSnapshot.create({
          data: { organizationId: orgId, ...snapData },
        });
        results.cashSnapshots++;
      }
    }

    // Import year start anchors
    if (data.yearStartAnchors && Array.isArray(data.yearStartAnchors)) {
      for (const anchor of data.yearStartAnchors) {
        const { id, organizationId, createdAt, ...anchorData } = anchor;
        await prisma.yearStartAnchor.upsert({
          where: { organizationId_year: { organizationId: orgId, year: anchorData.year } },
          update: anchorData,
          create: { organizationId: orgId, ...anchorData },
        });
        results.yearStartAnchors++;
      }
    }

    // Import cash injections
    if (data.cashInjections && Array.isArray(data.cashInjections)) {
      for (const inj of data.cashInjections) {
        const { id, organizationId, createdAt, ...injData } = inj;
        await prisma.cashInjection.create({
          data: { organizationId: orgId, ...injData },
        });
        results.cashInjections++;
      }
    }

    // Import vendors
    if (data.vendors && Array.isArray(data.vendors)) {
      for (const vendor of data.vendors) {
        const { id, organizationId, createdAt, expenses, ...vendorData } = vendor;
        await prisma.vendorTemplate.create({
          data: { organizationId: orgId, ...vendorData },
        });
        results.vendors++;
      }
    }

    // Import expense transactions (after vendors)
    if (data.expenseTransactions && Array.isArray(data.expenseTransactions)) {
      for (const exp of data.expenseTransactions) {
        const { id, organizationId, createdAt, vendorId, ...expData } = exp;
        await prisma.expenseTransaction.create({
          data: { organizationId: orgId, ...expData },
        });
        results.expenseTransactions++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Import complete',
      results 
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
