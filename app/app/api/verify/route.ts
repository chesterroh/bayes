import { NextRequest, NextResponse } from 'next/server';
import { HypothesisService } from '@/lib/db/hypothesis';

// POST /api/verify - Verify or refute a hypothesis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.hypothesisId || !body.evidenceId || !body.verificationType) {
      return NextResponse.json(
        { error: 'Missing required fields: hypothesisId, evidenceId, verificationType' },
        { status: 400 }
      );
    }
    
    // Validate verification type
    if (body.verificationType !== 'confirmed' && body.verificationType !== 'refuted') {
      return NextResponse.json(
        { error: 'Verification type must be either "confirmed" or "refuted"' },
        { status: 400 }
      );
    }
    
    const hypothesis = await HypothesisService.verify(
      body.hypothesisId,
      body.evidenceId,
      body.verificationType
    );
    
    if (!hypothesis) {
      return NextResponse.json(
        { error: 'Failed to verify hypothesis - hypothesis or evidence not found' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: `Hypothesis ${body.verificationType}`,
      hypothesis,
      verificationType: body.verificationType,
      newConfidence: body.verificationType === 'confirmed' ? 1.0 : 0.0
    });
  } catch (error) {
    console.error('Error verifying hypothesis:', error);
    return NextResponse.json(
      { error: 'Failed to verify hypothesis' },
      { status: 500 }
    );
  }
}