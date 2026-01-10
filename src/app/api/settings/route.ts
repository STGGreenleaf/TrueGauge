import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { SettingsSchema, DEFAULT_SETTINGS } from '@/lib/types';
import { getCurrentOrgId, getOrCreateSettings } from '@/lib/org';

const SHOWCASE_ORG_ID = 'showcase-template';

export async function GET(request: Request) {
  try {
    // Check for showcase mode (User View toggle)
    const { searchParams } = new URL(request.url);
    const isShowcase = searchParams.get('showcase') === 'true';
    const isNewUser = searchParams.get('newUser') === 'true';
    
    // New user simulation - return empty defaults
    if (isNewUser) {
      return NextResponse.json({
        id: 0,
        ...DEFAULT_SETTINGS,
      });
    }
    
    const orgId = isShowcase ? SHOWCASE_ORG_ID : await getCurrentOrgId();
    const settings = await getOrCreateSettings(orgId);
    
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
    const orgId = await getCurrentOrgId();
    const body = await request.json();
    const validated = SettingsSchema.parse(body);
    
    const settings = await prisma.settings.upsert({
      where: { organizationId: orgId },
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
        nutSubscriptions: validated.nutSubscriptions ?? 0,
        nutOther1: validated.nutOther1 ?? 0,
        nutOther1Label: validated.nutOther1Label ?? 'Other 1',
        nutOther1Note: validated.nutOther1Note,
        nutOther2: validated.nutOther2 ?? 0,
        nutOther2Label: validated.nutOther2Label ?? 'Other 2',
        nutOther2Note: validated.nutOther2Note,
        nutOther3: validated.nutOther3 ?? 0,
        nutOther3Label: validated.nutOther3Label ?? 'Other 3',
        nutOther3Note: validated.nutOther3Note,
        // Optional goals
        monthlyRoofFund: validated.monthlyRoofFund,
        monthlyRoofFundLabel: validated.monthlyRoofFundLabel ?? 'Monthly Roof Fund',
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
        businessStartDate: validated.businessStartDate,
      },
      create: {
        organizationId: orgId,
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
        nutSubscriptions: validated.nutSubscriptions ?? 0,
        nutOther1: validated.nutOther1 ?? 0,
        nutOther1Label: validated.nutOther1Label ?? 'Other 1',
        nutOther1Note: validated.nutOther1Note,
        nutOther2: validated.nutOther2 ?? 0,
        nutOther2Label: validated.nutOther2Label ?? 'Other 2',
        nutOther2Note: validated.nutOther2Note,
        nutOther3: validated.nutOther3 ?? 0,
        nutOther3Label: validated.nutOther3Label ?? 'Other 3',
        nutOther3Note: validated.nutOther3Note,
        // Optional goals
        monthlyRoofFund: validated.monthlyRoofFund,
        monthlyRoofFundLabel: validated.monthlyRoofFundLabel ?? 'Monthly Roof Fund',
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
        businessStartDate: validated.businessStartDate,
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
