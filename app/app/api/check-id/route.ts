import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

// GET /api/check-id?type=hypothesis&id=H001
// GET /api/check-id?type=evidence&id=E001
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json(
      { error: 'Type and ID are required' },
      { status: 400 }
    );
  }

  if (type !== 'hypothesis' && type !== 'evidence') {
    return NextResponse.json(
      { error: 'Type must be either "hypothesis" or "evidence"' },
      { status: 400 }
    );
  }

  const session = getSession();
  
  try {
    const nodeLabel = type === 'hypothesis' ? 'Hypothesis' : 'Evidence';
    const query = `MATCH (n:${nodeLabel} {id: $id}) RETURN count(n) as count`;
    
    const result = await session.run(query, { id });
    const count = result.records[0].get('count').toNumber();
    
    return NextResponse.json({ 
      exists: count > 0,
      id,
      type
    });
  } catch (error) {
    console.error('Failed to check ID:', error);
    return NextResponse.json(
      { error: 'Failed to check ID' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}