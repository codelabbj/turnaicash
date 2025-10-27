import { NextRequest, NextResponse } from 'next/server';

// Stub implementations for static export

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'API not available in static export' },
    { status: 503 }
  );
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'API not available in static export' },
    { status: 503 }
  );
}
