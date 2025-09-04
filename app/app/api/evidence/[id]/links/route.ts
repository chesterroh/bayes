import { NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const links = await EvidenceService.getLinkedHypotheses(id);
    
    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching evidence links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evidence links' },
      { status: 500 }
    );
  }
}