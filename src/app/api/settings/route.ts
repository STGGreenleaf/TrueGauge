import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { SettingsSchema, DEFAULT_SETTINGS } from '@/lib/types';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.settings.create({
        data: {
          businessName: DEFAULT_SETTINGS.businessName,
          timezone: DEFAULT_SETTINGS.timezone,
          salesInputMode: DEFAULT_SETTINGS.salesInputMode,
          targetCogsPct: DEFAULT_SETTINGS.targetCogsPct,
          targetFeesPct: DEFAULT_SETTINGS.targetFeesPct,
          monthlyFixedNut: DEFAULT_SETTINGS.monthlyFixedNut,
          monthlyRoofFund: DEFAULT_SETTINGS.monthlyRoofFund,
          monthlyOwnerDrawGoal: DEFAULT_SETTINGS.monthlyOwnerDrawGoal,
          openHoursTemplate: JSON.stringify(DEFAULT_SETTINGS.openHoursTemplate),
          enableTrueHealth: DEFAULT_SETTINGS.enableTrueHealth,
          enableSpreading: DEFAULT_SETTINGS.enableSpreading,
        },
      });
    }
    
    // Parse openHoursTemplate from JSON string
    const parsedSettings = {
      ...settings,
      openHoursTemplate: JSON.parse(settings.openHoursTemplate),
    };
    
    return NextResponse.json(parsedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validated = SettingsSchema.parse(body);
    
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        businessName: validated.businessName,
        timezone: validated.timezone,
        salesInputMode: validated.salesInputMode,
        targetCogsPct: validated.targetCogsPct,
        targetFeesPct: validated.targetFeesPct,
        monthlyFixedNut: validated.monthlyFixedNut,
        // NUT breakdown
        nutRent: validated.nutRent ?? 0,
        nutUtilities: validated.nutUtilities ?? 0,
        nutPhone: validated.nutPhone ?? 0,
        nutInternet: validated.nutInternet ?? 0,
        nutInsurance: validated.nutInsurance ?? 0,
        nutLoanPayment: validated.nutLoanPayment ?? 0,
        nutPayroll: validated.nutPayroll ?? 0,
        nutOther1: validated.nutOther1 ?? 0,
        nutOther1Label: validated.nutOther1Label ?? 'Other 1',
        nutOther2: validated.nutOther2 ?? 0,
        nutOther2Label: validated.nutOther2Label ?? 'Other 2',
        nutOther3: validated.nutOther3 ?? 0,
        nutOther3Label: validated.nutOther3Label ?? 'Other 3',
        // Optional goals
        monthlyRoofFund: validated.monthlyRoofFund,
        monthlyOwnerDrawGoal: validated.monthlyOwnerDrawGoal,
        openHoursTemplate: JSON.stringify(validated.openHoursTemplate),
        enableTrueHealth: validated.enableTrueHealth,
        enableSpreading: validated.enableSpreading,
        cashSnapshotAmount: validated.cashSnapshotAmount,
        cashSnapshotAsOf: validated.cashSnapshotAsOf,
        yearStartCashAmount: validated.yearStartCashAmount,
        yearStartCashDate: validated.yearStartCashDate,
        operatingFloorCash: validated.operatingFloorCash ?? 0,
        targetReserveCash: validated.targetReserveCash ?? 100000,
      },
      create: {
        businessName: validated.businessName,
        timezone: validated.timezone,
        salesInputMode: validated.salesInputMode,
        targetCogsPct: validated.targetCogsPct,
        targetFeesPct: validated.targetFeesPct,
        monthlyFixedNut: validated.monthlyFixedNut,
        // NUT breakdown
        nutRent: validated.nutRent ?? 0,
        nutUtilities: validated.nutUtilities ?? 0,
        nutPhone: validated.nutPhone ?? 0,
        nutInternet: validated.nutInternet ?? 0,
        nutInsurance: validated.nutInsurance ?? 0,
        nutLoanPayment: validated.nutLoanPayment ?? 0,
        nutPayroll: validated.nutPayroll ?? 0,
        nutOther1: validated.nutOther1 ?? 0,
        nutOther1Label: validated.nutOther1Label ?? 'Other 1',
        nutOther2: validated.nutOther2 ?? 0,
        nutOther2Label: validated.nutOther2Label ?? 'Other 2',
        nutOther3: validated.nutOther3 ?? 0,
        nutOther3Label: validated.nutOther3Label ?? 'Other 3',
        // Optional goals
        monthlyRoofFund: validated.monthlyRoofFund,
        monthlyOwnerDrawGoal: validated.monthlyOwnerDrawGoal,
        openHoursTemplate: JSON.stringify(validated.openHoursTemplate),
        enableTrueHealth: validated.enableTrueHealth,
        enableSpreading: validated.enableSpreading,
        cashSnapshotAmount: validated.cashSnapshotAmount,
        cashSnapshotAsOf: validated.cashSnapshotAsOf,
        yearStartCashAmount: validated.yearStartCashAmount,
        yearStartCashDate: validated.yearStartCashDate,
        operatingFloorCash: validated.operatingFloorCash ?? 0,
        targetReserveCash: validated.targetReserveCash ?? 100000,
      },
    });
    
    const parsedSettings = {
      ...settings,
      openHoursTemplate: JSON.parse(settings.openHoursTemplate),
    };
    
    return NextResponse.json(parsedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
