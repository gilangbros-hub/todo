import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateLoginInput } from '@/lib/auth/validation';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = validateLoginInput(body);

  if (!validation.valid) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Invalid credentials. The realm rejects your entry.' },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
