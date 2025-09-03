import { NextRequest, NextResponse } from 'next/server';
import { BayesianService } from '@/lib/db/bayesian';

// POST /api/update - Trigger Bayesian update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.hypothesisId || !body.evidenceId) {
      return NextResponse.json(
        { error: 'Missing required fields: hypothesisId, evidenceId' },
        { status: 400 }
      );
    }
    
    // Perform Bayesian update
    const result = await BayesianService.updateHypothesis(
      body.hypothesisId,
      body.evidenceId
    );
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update - hypothesis may be verified or relationship not found' },
        { status: 400 }
      );
    }
    
    // Optionally propagate updates if requested
    let propagationResults = null;
    if (body.propagate) {
      const confidenceChange = result.newConfidence - result.oldConfidence;
      propagationResults = await BayesianService.propagateUpdate(
        body.hypothesisId,
        confidenceChange,
        body.dampeningFactor || 0.8
      );
    }
    
    return NextResponse.json({
      hypothesisId: body.hypothesisId,
      evidenceId: body.evidenceId,
      update: {
        oldConfidence: result.oldConfidence,
        newConfidence: result.newConfidence,
        change: result.newConfidence - result.oldConfidence
      },
      propagation: propagationResults
    });
  } catch (error) {
    console.error('Error performing Bayesian update:', error);
    return NextResponse.json(
      { error: 'Failed to perform Bayesian update' },
      { status: 500 }
    );
  }
}