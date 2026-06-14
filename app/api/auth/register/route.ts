import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRegistrationInput } from '@/lib/auth/validation';

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
    confirmPassword: typeof body.confirmPassword === 'string' ? body.confirmPassword : undefined,
  };
  const validation = validateRegistrationInput(input);

  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const reqBody = input as { email: string; password: string };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: reqBody.email.trim(),
    password: reqBody.password,
  });

  if (error) {
    console.error('Registration error:', error.message, error.status);
    return NextResponse.json(
      { error: `Registration failed: ${error.message}` },
      { status: 400 }
    );
  }

  if (data.user) {
    const { error: statsError } = await supabase.from('player_stats').insert({
      user_id: data.user.id,
      xp: 0,
      level: 1,
      streak: 0,
      last_completed_date: null,
    });

    if (statsError) {
      console.error('Player stats init failed:', statsError.message);
    }
  }

  return NextResponse.json({ success: true });
}
