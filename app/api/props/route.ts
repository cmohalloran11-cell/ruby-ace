// app/api/props/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 600; // 10 min cache

const STAT_LABELS: Record<string, string> = {
  batter_home_runs: 'Home Runs',
  batter_hits: 'Hits',
  batter_total_bases: 'Total Bases',
  batter_rbis: 'RBIs',
  batter_runs_scored: 'Runs Scored',
  batter_stolen_bases: 'Stolen Bases',
  batter_strikeouts: 'Strikeouts (Batter)',
  pitcher_strikeouts: 'Strikeouts',
  pitcher_hits_allowed: 'Hits Allowed',
  pitcher_earned_runs: 'Earned Runs',
  pitcher_walks: 'Walks',
  pitcher_outs: 'Outs Recorded',
};

export async function GET() {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Odds API key not configured' }, { status: 500 });
  }

  try {
    // Step 1: get today's MLB event IDs
    const eventsRes = await fetch(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/events?apiKey=${key}`,
      { next: { revalidate: 600 } }
    );

    if (!eventsRes.ok) {
      throw new Error(`Odds API events error: ${eventsRes.status}`);
    }

    const events = await eventsRes.json();
    if (!events.length) return NextResponse.json([]);

    // Step 2: fetch player props for each event (limit to first 3 to save quota)
    const propsPromises = events.slice(0, 3).map(async (event: any) => {
      const markets = [
        'batter_home_runs',
        'batter_hits',
        'batter_total_bases',
        'pitcher_strikeouts',
        'batter_stolen_bases',
      ].join(',');

      const res = await fetch(
        `https://api.the-odds-api.com/v4/sports/baseball_mlb/events/${event.id}/odds?apiKey=${key}&regions=us&markets=${markets}&oddsFormat=american`,
        { next: { revalidate: 600 } }
      );

      if (!res.ok) return [];

      const data = await res.json();
      const bookmaker = data.bookmakers?.find((b: any) =>
        ['draftkings', 'fanduel', 'betmgm'].includes(b.key)
      ) || data.bookmakers?.[0];

      if (!bookmaker) return [];

      return bookmaker.markets.flatMap((market: any) =>
        market.outcomes
          .filter((o: any) => o.name === 'Over' || o.name === 'Under')
          .map((o: any) => ({
            player: o.description || 'Unknown',
            stat: STAT_LABELS[market.key] || market.key,
            line: o.point,
            direction: o.name.toLowerCase(),
            odds: o.price,
            game: `${event.away_team} @ ${event.home_team}`,
            gameId: event.id,
            commence: event.commence_time,
          }))
      );
    });

    const allProps = (await Promise.all(propsPromises)).flat();

    // Add confidence scores based on line value and stat type
    const withConfidence = allProps.map((p: any) => ({
      ...p,
      confidence: calcConfidence(p),
      hitRate: calcHitRate(p),
    }));

    return NextResponse.json(withConfidence);
  } catch (e: any) {
    console.error('Props API error:', e.message);
    // Return empty array rather than error — UI will show "no picks available"
    return NextResponse.json([]);
  }
}

function calcConfidence(pick: any): number {
  // Simple heuristic — refine with your own model
  const base = 6.5;
  if (pick.stat === 'Strikeouts' && pick.direction === 'over') return Math.min(9.5, base + 1.5);
  if (pick.stat === 'Total Bases' && pick.direction === 'over') return Math.min(9.5, base + 1.2);
  if (pick.stat === 'Hits' && pick.direction === 'over') return Math.min(9.5, base + 0.8);
  return parseFloat((base + Math.random() * 1.5).toFixed(1));
}

function calcHitRate(pick: any): number {
  // Placeholder — wire to your historical data when available
  const base = pick.direction === 'over' ? 58 : 55;
  return Math.min(82, base + Math.floor(Math.random() * 18));
}
