import prisma from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_ORG_ID = 'default-org';

/**
 * Get or create the default organization for single-tenant mode.
 * This will be replaced with proper auth-based org lookup later.
 */
export async function getOrCreateDefaultOrg() {
  let org = await prisma.organization.findUnique({
    where: { id: DEFAULT_ORG_ID },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: DEFAULT_ORG_ID,
        name: 'My Business',
        updatedAt: new Date(),
      },
    });
  }

  return org;
}

/**
 * Get or create settings for an organization.
 */
export async function getOrCreateSettings(organizationId: string) {
  let settings = await prisma.settings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        organizationId,
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
        updatedAt: new Date(),
      },
    });
  }

  return settings;
}

/**
 * Get the current organization ID from authenticated user.
 * Falls back to default-org for unauthenticated requests.
 */
export async function getCurrentOrgId(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Find user's organization
      const orgUser = await prisma.organizationUser.findFirst({
        where: { userId: user.id },
        select: { organizationId: true },
      });
      
      if (orgUser) {
        return orgUser.organizationId;
      }
    }
  } catch (error) {
    // Supabase client may fail in some contexts, fall back to default
    console.log('Auth check failed, using default org');
  }
  
  // Fallback to default org (for API routes without auth)
  const org = await getOrCreateDefaultOrg();
  return org.id;
}
