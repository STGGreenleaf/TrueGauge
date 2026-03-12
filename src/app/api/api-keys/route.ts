import { NextResponse } from 'next/server';
import { getCurrentOrgId, assertNotShowcase } from '@/lib/org';
import { createApiKey, listApiKeys, revokeApiKey, deleteApiKey } from '@/lib/api-keys';

export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    const keys = await listApiKeys(orgId);
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getCurrentOrgId();
    assertNotShowcase(orgId);
    
    const body = await request.json();
    const label = body.label || 'Fülkit';
    
    const result = await createApiKey(orgId, label);
    
    return NextResponse.json({
      success: true,
      rawKey: result.rawKey,
      keyPrefix: result.keyPrefix,
      id: result.id,
      message: 'API key created. This key will only be shown once - copy it now!',
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const orgId = await getCurrentOrgId();
    assertNotShowcase(orgId);
    
    const body = await request.json();
    const { id, action } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });
    }
    
    if (action === 'revoke') {
      const success = await revokeApiKey(id, orgId);
      return NextResponse.json({ success, message: success ? 'Key revoked' : 'Key not found' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const orgId = await getCurrentOrgId();
    assertNotShowcase(orgId);
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });
    }
    
    const success = await deleteApiKey(id, orgId);
    return NextResponse.json({ success, message: success ? 'Key deleted' : 'Key not found' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
