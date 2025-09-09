import { NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';
import { HypothesisService } from '@/lib/db/hypothesis';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Ensure the hypothesis exists; return 404 if not
    const hyp = await HypothesisService.getById(id);
    if (!hyp) {
      return NextResponse.json(
        { error: 'Hypothesis not found' },
        { status: 404 }
      );
    }

    const links = await EvidenceService.getByHypothesis(id);
    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching hypothesis links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hypothesis links' },
      { status: 500 }
    );
  }
}

