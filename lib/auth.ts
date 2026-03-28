// lib/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getServiceSupabase } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  username: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function getTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function requireAuth(request: Request): Promise<JWTPayload> {
  const token = getTokenFromHeader(request.headers.get('authorization') ?? undefined);
  if (!token) throw new Error('Unauthorized');
  try {
    return verifyToken(token);
  } catch {
    throw new Error('Token invalid or expired');
  }
}

export async function requireAdmin(request: Request): Promise<JWTPayload> {
  const user = await requireAuth(request);
  if (user.role !== 'admin') throw new Error('Admin access required');
  return user;
}

// Check if the admin account exists, create it if not
export async function ensureAdminExists() {
  const sb = getServiceSupabase();
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@mlbpro.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

  const { data } = await sb
    .from('users')
    .select('id')
    .eq('email', adminEmail)
    .single();

  if (!data) {
    const hash = await hashPassword(adminPassword);
    await sb.from('users').insert({
      email: adminEmail,
      username: 'admin',
      password_hash: hash,
      role: 'admin',
    });
    console.log('Admin account created:', adminEmail);
  }
}
