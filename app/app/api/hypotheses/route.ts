import { NextRequest, NextResponse } from 'next/server';
import { HypothesisService } from '@/lib/db/hypothesis';

// GET /api/hypotheses - Get all hypotheses
export async function GET() {
  try {
    const hypotheses = await HypothesisService.getAll();
    return NextResponse.json(hypotheses);
  } catch (error) {
    console.error('Error fetching hypotheses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hypotheses' },
      { status: 500 }
    );
  }
}

// POST /api/hypotheses - Create new hypothesis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.id || !body.statement || body.confidence === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id, statement, confidence' },
        { status: 400 }
      );
    }
    
    // Validate confidence range
    if (body.confidence < 0 || body.confidence > 1) {
      return NextResponse.json(
        { error: 'Confidence must be between 0 and 1' },
        { status: 400 }
      );
    }
    
    const hypothesis = await HypothesisService.create({
      id: body.id,
      statement: body.statement,
      confidence: body.confidence
    });
    
    return NextResponse.json(hypothesis, { status: 201 });
  } catch (error) {
    console.error('Error creating hypothesis:', error);
    return NextResponse.json(
      { error: 'Failed to create hypothesis' },
      { status: 500 }
    );
  }
}