// app/api/news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchTeamNews, fetchAllNews } from '@/lib/news';

export const revalidate = 900; // 15 min

export async function GET(request: NextRequest) {
  const team = request.nextUrl.searchParams.get('team') || 'ALL';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '25');

  try {
    const news = team === 'ALL'
      ? await fetchAllNews(limit)
      : await fetchTeamNews(team, limit);
    return NextResponse.json(news);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
