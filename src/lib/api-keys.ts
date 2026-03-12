import { prisma } from './prisma';

const KEY_PREFIX = 'tg_sk_';

/**
 * Generate a random API key with the TrueGauge prefix
 * Format: tg_sk_ + 32 hex characters
 */
export function generateApiKey(): string {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${KEY_PREFIX}${hex}`;
}

/**
 * Hash an API key using SHA-256
 * Never store raw keys - always hash them
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Extract the prefix from a key for display purposes
 * Shows first 14 characters (tg_sk_ + first 8 hex)
 */
export function getKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 14);
}

/**
 * Validate an API key and return the organization ID if valid
 * Returns null if the key is invalid or revoked
 */
export async function validateApiKey(rawKey: string): Promise<{
  orgId: string | null;
  keyPrefix: string;
}> {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
    return { orgId: null, keyPrefix: '' };
  }

  const keyPrefix = getKeyPrefix(rawKey);
  const keyHash = await hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      isRevoked: false,
    },
    select: {
      organizationId: true,
    },
  });

  if (apiKey) {
    // Fire-and-forget: update last_used_at
    prisma.apiKey
      .updateMany({
        where: { keyHash },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});
  }

  return {
    orgId: apiKey?.organizationId || null,
    keyPrefix,
  };
}

/**
 * Create a new API key for an organization
 * Returns the raw key (only shown once) and the stored key data
 */
export async function createApiKey(
  organizationId: string,
  label: string = 'Fülkit'
): Promise<{
  rawKey: string;
  keyPrefix: string;
  id: string;
}> {
  const rawKey = generateApiKey();
  const keyHash = await hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId,
      keyHash,
      keyPrefix,
      label,
    },
  });

  return {
    rawKey,
    keyPrefix,
    id: apiKey.id,
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, organizationId: string): Promise<boolean> {
  const result = await prisma.apiKey.updateMany({
    where: {
      id: keyId,
      organizationId,
    },
    data: {
      isRevoked: true,
    },
  });
  return result.count > 0;
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId: string, organizationId: string): Promise<boolean> {
  const result = await prisma.apiKey.deleteMany({
    where: {
      id: keyId,
      organizationId,
    },
  });
  return result.count > 0;
}

/**
 * List all API keys for an organization (without the actual key values)
 */
export async function listApiKeys(organizationId: string) {
  return prisma.apiKey.findMany({
    where: { organizationId },
    select: {
      id: true,
      keyPrefix: true,
      label: true,
      createdAt: true,
      lastUsedAt: true,
      isRevoked: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Log an API action to the audit log
 */
export async function logApiAction(params: {
  organizationId: string;
  apiKeyPrefix: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  changes?: object;
  impact?: object;
  snapshot?: object;
  undoExpiresAt?: Date;
}) {
  return prisma.apiAuditLog.create({
    data: {
      organizationId: params.organizationId,
      apiKeyPrefix: params.apiKeyPrefix,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      changes: params.changes as object | undefined,
      impact: params.impact as object | undefined,
      snapshot: params.snapshot as object | undefined,
      undoExpiresAt: params.undoExpiresAt,
    },
  });
}

/**
 * Get recent API activity for an organization
 */
export async function getRecentActivity(organizationId: string, limit: number = 10) {
  return prisma.apiAuditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      action: true,
      targetType: true,
      targetName: true,
      createdAt: true,
      apiKeyPrefix: true,
    },
  });
}
