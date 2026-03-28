// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Check existing
    const { data: existing } = await sb
      .from('users')
      .select('id')
      .or(`email.eq.${email.toLowerCase()},username.eq.${username}`)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 });
    }

    const hash = await hashPassword(password);
    const { data: newUser, error } = await sb
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password_hash: hash,
        role: 'user',
      })
      .select()
      .single();

    if (error) throw error;

    const token = signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      username: newUser.username,
    });

    return NextResponse.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        subscription: 'free',
      },
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
