import prisma from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const DEFAULT_ORG_ID = 'default-org';
const SHOWCASE_ORG_ID = 'showcase-template';

// Export for use in guards
export { SHOWCASE_ORG_ID };

/**
 * Guard: Throws if attempting to write to showcase-template.
 * Use this in all write endpoints (POST, PUT, DELETE) to enforce read-only demo.
 */
export function assertNotShowcase(orgId: string): void {
  if (orgId === SHOWCASE_ORG_ID) {
    throw new Error('SHOWCASE_READ_ONLY: Cannot modify showcase data');
  }
}

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

// Owner user ID (Supabase auth UUID) - set via environment variable
const OWNER_USER_ID = process.env.OWNER_USER_ID;

/**
 * Get the current organization ID from authenticated user.
 * Auto-links owner email to default-org if not already linked.
 * 
 * IMPORTANT: This function should NEVER return default-org (HBBEVCO) for non-owners.
 * - In dev mode with NEXT_PUBLIC_DEV_MODE=true, showcase mode is handled client-side
 * - The fallback returns showcase-template to prevent HBBEVCO exposure
 */
export async function getCurrentOrgId(): Promise<string> {
  // In dev mode, use showcase template (not HBBEVCO)
  // Client-side demo toggle handles switching between showcase and blank
  if (process.env.NODE_ENV === 'development') {
    return SHOWCASE_ORG_ID;
  }
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Find user's organization
    let orgUser = await prisma.organizationUser.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    
    if (orgUser) {
      return orgUser.organizationId;
    }
    
    // User authenticated but not linked - auto-link owner to default-org
    if (OWNER_USER_ID && user.id === OWNER_USER_ID) {
      // Ensure user record exists
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Owner',
          avatarUrl: user.user_metadata?.avatar_url,
        },
      });
      
      // Link to default-org
      await prisma.organizationUser.create({
        data: {
          organizationId: DEFAULT_ORG_ID,
          userId: user.id,
          role: 'owner',
        },
      });
      
      return DEFAULT_ORG_ID;
    }
  }
  
  // Not authenticated or not owner - return showcase template
  // This prevents HBBEVCO data exposure to unauthorized users
  return SHOWCASE_ORG_ID;
}
