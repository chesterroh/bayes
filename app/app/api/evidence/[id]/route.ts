import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';

// GET /api/evidence/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evidence = await EvidenceService.get(params.id);
    if (!evidence) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(evidence);
  } catch (error) {
    console.error('Failed to get evidence:', error);
    return NextResponse.json(
      { error: 'Failed to get evidence' },
      { status: 500 }
    );
  }
}

// PUT /api/evidence/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content, source_url } = body;

    if (!content || !source_url) {
      return NextResponse.json(
        { error: 'Content and source URL are required' },
        { status: 400 }
      );
    }

    const updated = await EvidenceService.update(params.id, {
      content,
      source_url
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update evidence:', error);
    return NextResponse.json(
      { error: 'Failed to update evidence' },
      { status: 500 }
    );
  }
}

// DELETE /api/evidence/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await EvidenceService.delete(params.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete evidence:', error);
    return NextResponse.json(
      { error: 'Failed to delete evidence' },
      { status: 500 }
    );
  }
}