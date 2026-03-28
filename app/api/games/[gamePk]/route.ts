// app/api/games/[gamePk]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveGame } from '@/lib/mlb-api';

export async function GET(
  _request: NextRequest,
  { params }: { params: { gamePk: string } }
) {
  try {
    const data = await fetchLiveGame(Number(params.gamePk));
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
