import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

// GET /api/next-id?type=hypothesis|evidence
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  
  if (!type || (type !== 'hypothesis' && type !== 'evidence')) {
    return NextResponse.json(
      { error: 'Invalid type. Must be "hypothesis" or "evidence"' },
      { status: 400 }
    );
  }
  
  const session = getSession();
  
  try {
    // Simple query to get all IDs
    const nodeLabel = type === 'hypothesis' ? 'Hypothesis' : 'Evidence';
    const prefix = type === 'hypothesis' ? 'H' : 'E';
    
    const query = `MATCH (n:${nodeLabel}) RETURN n.id as id ORDER BY n.id`;
    const result = await session.run(query);
    
    // Extract numbers from existing IDs
    let maxNum = 0;
    const existingIds: string[] = [];
    
    for (const record of result.records) {
      const id = record.get('id');
      if (id) {
        existingIds.push(id);
        // Try to extract number from ID (e.g., H001 -> 1)
        const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    
    // Generate next ID
    const nextNum = maxNum + 1;
    const nextId = `${prefix}${String(nextNum).padStart(3, '0')}`;
    
    // Make sure the generated ID doesn't already exist
    let finalId = nextId;
    let finalNum = nextNum;
    while (existingIds.includes(finalId)) {
      finalNum++;
      finalId = `${prefix}${String(finalNum).padStart(3, '0')}`;
    }
    
    return NextResponse.json({
      nextId: finalId,
      prefix,
      nextNumber: finalNum,
      existingCount: existingIds.length,
      suggestion: finalId
    });
  } catch (error: any) {
    console.error('Error generating next ID:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate next ID',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}