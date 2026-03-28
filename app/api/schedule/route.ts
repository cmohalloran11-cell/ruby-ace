// app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchTodaySchedule } from '@/lib/mlb-api';
import { fetchWeatherForAllGames } from '@/lib/weather';

export const revalidate = 300; // 5 min cache

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date') || undefined;
    const games = await fetchTodaySchedule(date);
    const weather = await fetchWeatherForAllGames(games);

    // Merge weather into games
    const gamesWithWeather = games.map((g: any) => ({
      ...g,
      weather: weather[g.id] || null,
    }));

    return NextResponse.json(gamesWithWeather);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
