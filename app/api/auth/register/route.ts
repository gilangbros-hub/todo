import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateRegistrationInput } from '@/lib/auth/validation';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = validateRegistrationInput(body);

  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: body.email.trim(),
    password: body.password,
  });

  if (error) {
    console.error('Registration error:', error.message, error.status);
    return NextResponse.json(
      { error: `Registration failed: ${error.message}` },
      { status: 400 }
    );
  }

  // Initialize Player_Stats for the new user
  if (data.user) {
    await supabase.from('player_stats').insert({
      user_id: data.user.id,
      xp: 0,
      level: 1,
      streak: 0,
      last_completed_date: null,
    });
  }

  return NextResponse.json({ success: true });
}
