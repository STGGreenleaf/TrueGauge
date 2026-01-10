// Brand configuration - editable via Owner Portal
// This file is the source of truth for site metadata

export interface BrandConfig {
  ogTitle: string;
  ogDescription: string;
  ogImage: string | null;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  robotsIndex: boolean;
  robotsFollow: boolean;
}

export const defaultBrandConfig: BrandConfig = {
  ogTitle: 'TrueGauge - Precision Business Health',
  ogDescription: 'Your instrument panel for business clarity',
  ogImage: null,
  seoTitle: 'TrueGauge',
  seoDescription: 'Business health dashboard for smart operators',
  seoKeywords: ['business dashboard', 'financial health', 'business analytics', 'cash flow'],
  robotsIndex: true,
  robotsFollow: true,
};

// In a production app, this would be stored in a database
// For now, we'll use a JSON file approach
export function getBrandConfig(): BrandConfig {
  return defaultBrandConfig;
}
