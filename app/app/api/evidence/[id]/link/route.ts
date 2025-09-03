import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';

// POST /api/evidence/[id]/link - Link evidence to hypothesis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evidenceId } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.hypothesisId || body.strength === undefined || !body.direction) {
      return NextResponse.json(
        { error: 'Missing required fields: hypothesisId, strength, direction' },
        { status: 400 }
      );
    }
    
    // Validate strength range
    if (body.strength < 0 || body.strength > 1) {
      return NextResponse.json(
        { error: 'Strength must be between 0 and 1' },
        { status: 400 }
      );
    }
    
    // Validate direction
    if (body.direction !== 'supports' && body.direction !== 'contradicts') {
      return NextResponse.json(
        { error: 'Direction must be either "supports" or "contradicts"' },
        { status: 400 }
      );
    }
    
    const linked = await EvidenceService.linkToHypothesis(
      evidenceId,
      body.hypothesisId,
      {
        strength: body.strength,
        direction: body.direction
      }
    );
    
    if (!linked) {
      return NextResponse.json(
        { error: 'Failed to link evidence to hypothesis' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Evidence linked to hypothesis successfully',
      evidenceId,
      hypothesisId: body.hypothesisId,
      relationship: {
        strength: body.strength,
        direction: body.direction
      }
    });
  } catch (error) {
    console.error('Error linking evidence:', error);
    return NextResponse.json(
      { error: 'Failed to link evidence to hypothesis' },
      { status: 500 }
    );
  }
}