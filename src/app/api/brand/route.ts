import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'src/lib/brand-config.json');

export async function GET() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    // Return defaults if file doesn't exist
    return NextResponse.json({
      ogTitle: 'TrueGauge - Precision Business Health',
      ogDescription: 'Your instrument panel for business clarity',
      ogImage: null,
      seoTitle: 'TrueGauge',
      seoDescription: 'Business health dashboard for smart operators',
      seoKeywords: ['business dashboard', 'financial health', 'business analytics', 'cash flow'],
      robotsIndex: true,
      robotsFollow: true,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const config = {
      ogTitle: body.ogTitle || 'TrueGauge',
      ogDescription: body.ogDescription || '',
      ogImage: body.ogImage || null,
      seoTitle: body.seoTitle || 'TrueGauge',
      seoDescription: body.seoDescription || '',
      seoKeywords: body.seoKeywords || [],
      robotsIndex: body.robotsIndex ?? true,
      robotsFollow: body.robotsFollow ?? true,
    };
    
    // Save to JSON file
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Failed to save brand config:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
