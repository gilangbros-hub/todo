import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateDisplayName } from '@/lib/auth/validation';

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const nameErr = validateDisplayName(typeof body.displayName === 'string' ? body.displayName : '');

  if (nameErr) {
    return NextResponse.json({ error: nameErr }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: (body.displayName as string).trim() },
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update profile. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
