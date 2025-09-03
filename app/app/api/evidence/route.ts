import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';

// GET /api/evidence - Get all evidence
export async function GET() {
  try {
    const evidence = await EvidenceService.getAll();
    return NextResponse.json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  }
}

// POST /api/evidence - Create new evidence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.id || !body.content || !body.source_url) {
      return NextResponse.json(
        { error: 'Missing required fields: id, content, source_url' },
        { status: 400 }
      );
    }
    
    const evidence = await EvidenceService.create({
      id: body.id,
      content: body.content,
      source_url: body.source_url
    });
    
    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    console.error('Error creating evidence:', error);
    return NextResponse.json(
      { error: 'Failed to create evidence' },
      { status: 500 }
    );
  }
}