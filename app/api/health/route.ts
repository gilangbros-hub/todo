import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for Railway deployment verification.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
