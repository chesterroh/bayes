import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';

// POST /api/evidence/[id]/link - Link evidence to hypothesis
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: evidenceId } = params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.hypothesisId || body.p_e_given_h === undefined || body.p_e_given_not_h === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: hypothesisId, p_e_given_h, p_e_given_not_h' },
        { status: 400 }
      );
    }
    
    // Validate probability ranges
    const peh = Number(body.p_e_given_h);
    const penh = Number(body.p_e_given_not_h);
    if (
      Number.isNaN(peh) || Number.isNaN(penh) ||
      peh < 0 || peh > 1 || penh < 0 || penh > 1
    ) {
      return NextResponse.json(
        { error: 'p_e_given_h and p_e_given_not_h must be numbers between 0 and 1' },
        { status: 400 }
      );
    }
    
    const linked = await EvidenceService.linkToHypothesis(
      evidenceId,
      body.hypothesisId,
      {
        p_e_given_h: peh,
        p_e_given_not_h: penh
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
        p_e_given_h: peh,
        p_e_given_not_h: penh
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
