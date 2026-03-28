import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews, fetchTeamNews } from '@/lib/news';

export const revalidate = 900;

export async function GET(request: NextRequest) {
  const team = request.nextUrl.searchParams.get('team') || 'ALL';
  const tag = request.nextUrl.searchParams.get('tag') || 'all';
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '40');

  try {
    const news = team === 'ALL'
      ? await fetchAllNews(limit)
      : await fetchTeamNews(team, limit);

    const filtered = tag === 'all'
      ? news
      : news.filter(item => item.tag.toLowerCase() === tag.toLowerCase());

    return NextResponse.json(filtered);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
