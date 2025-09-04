import { NextRequest, NextResponse } from 'next/server';
import { HypothesisService } from '@/lib/db/hypothesis';

// GET /api/hypotheses/[id] - Get specific hypothesis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const hypothesis = await HypothesisService.getById(id);
    
    if (!hypothesis) {
      return NextResponse.json(
        { error: 'Hypothesis not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(hypothesis);
  } catch (error) {
    console.error('Error fetching hypothesis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hypothesis' },
      { status: 500 }
    );
  }
}

// PUT /api/hypotheses/[id] - Update hypothesis confidence
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (body.confidence === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: confidence' },
        { status: 400 }
      );
    }
    
    if (body.confidence < 0 || body.confidence > 1) {
      return NextResponse.json(
        { error: 'Confidence must be between 0 and 1' },
        { status: 400 }
      );
    }
    
    const hypothesis = await HypothesisService.updateConfidence(id, body.confidence);
    
    if (!hypothesis) {
      return NextResponse.json(
        { error: 'Hypothesis not found or already verified' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(hypothesis);
  } catch (error) {
    console.error('Error updating hypothesis:', error);
    return NextResponse.json(
      { error: 'Failed to update hypothesis' },
      { status: 500 }
    );
  }
}

// DELETE /api/hypotheses/[id] - Delete hypothesis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await HypothesisService.delete(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Hypothesis not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Hypothesis deleted successfully' });
  } catch (error) {
    console.error('Error deleting hypothesis:', error);
    return NextResponse.json(
      { error: 'Failed to delete hypothesis' },
      { status: 500 }
    );
  }
}
