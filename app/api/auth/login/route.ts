import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateLoginInput } from '@/lib/auth/validation';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const input = {
    email: typeof body.email === 'string' ? body.email : undefined,
    password: typeof body.password === 'string' ? body.password : undefined,
  };
  const validation = validateLoginInput(input);

  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const reqBody = input as { email: string; password: string };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: reqBody.email.trim(),
    password: reqBody.password,
  });

  if (error) {
    console.error('Login error:', error.message, error.status);
    return NextResponse.json(
      { error: `Login failed: ${error.message}` },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
