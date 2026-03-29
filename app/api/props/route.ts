// app/api/props/route.ts
// Generates player prop picks from theBatX projections in Supabase
// No external API key needed
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const revalidate = 300;

function americanOdds(impliedProb: number): number {
  // Convert implied probability to American odds
  if (impliedProb >= 0.5) return Math.round(-(impliedProb / (1 - impliedProb)) * 100);
  return Math.round(((1 - impliedProb) / impliedProb) * 100);
}

function calcConfidence(proj: number, line: number, stdDev: number): number {
  // Z-score based confidence (how many std devs above the line)
  const z = (proj - line) / (stdDev || 1);
  return Math.min(9.8, Math.max(5.0, 6.5 + z * 1.2));
}

function calcHitRate(proj: number, line: number, stdDev: number): number {
  // Rough probability of going over using normal distribution approximation
  const z = (proj - line) / (stdDev || 1);
  const p = 0.5 * (1 + Math.tanh(z * 0.7));
  return Math.round(Math.min(82, Math.max(42, p * 100)));
}

export async function GET() {
  try {
    const sb = getServiceSupabase();

    // Get most recent slate
    const { data: latest } = await sb
      .from('projections')
      .select('slate_date')
      .order('slate_date', { ascending: false })
      .limit(1)
      .single();

    if (!latest?.slate_date) return NextResponse.json([]);

    const { data: players, error } = await sb
      .from('projections')
      .select('*')
      .eq('slate_date', latest.slate_date)
      .gt('proj_fpts', 0);

    if (error || !players?.length) return NextResponse.json([]);

    const picks: any[] = [];

    for (const p of players) {
      const name = p.player_name;
      const team = p.team;
      const opp  = p.opp || '';
      const pos  = p.position;
      const game = opp ? `${team} vs ${opp}` : team;

      if (pos === 'SP') {
        // Pitcher strikeout over/under
        const kProj = parseFloat(p.proj_k) || 0;
        if (kProj >= 3) {
          const line = Math.round(kProj * 0.9 * 2) / 2; // round to nearest 0.5
          const conf = calcConfidence(kProj, line, kProj * 0.3);
          const hr   = calcHitRate(kProj, line, kProj * 0.3);
          picks.push({
            player: name, team, game, stat: 'Strikeouts',
            line, direction: 'over',
            odds: americanOdds(hr / 100),
            confidence: parseFloat(conf.toFixed(1)),
            hitRate: hr,
            projection: parseFloat(kProj.toFixed(1)),
          });
        }

        // Pitcher outs recorded
        const ipProj = parseFloat(p.proj_ip) || 0;
        if (ipProj >= 3) {
          const outsProj = ipProj * 3;
          const line = Math.round(outsProj * 0.9 * 2) / 2;
          const conf = calcConfidence(outsProj, line, outsProj * 0.25);
          const hr   = calcHitRate(outsProj, line, outsProj * 0.25);
          picks.push({
            player: name, team, game, stat: 'Outs Recorded',
            line, direction: 'over',
            odds: americanOdds(hr / 100),
            confidence: parseFloat(conf.toFixed(1)),
            hitRate: hr,
            projection: parseFloat(outsProj.toFixed(1)),
          });
        }
      } else {
        // Hitter hits
        const hProj = parseFloat(p.proj_h) || 0;
        if (hProj >= 0.6) {
          const line = 0.5;
          const conf = calcConfidence(hProj, line, hProj * 0.6);
          const hr   = calcHitRate(hProj, line, hProj * 0.6);
          picks.push({
            player: name, team, game, stat: 'Hits',
            line, direction: 'over',
            odds: americanOdds(hr / 100),
            confidence: parseFloat(conf.toFixed(1)),
            hitRate: hr,
            projection: parseFloat(hProj.toFixed(1)),
          });
        }

        // Total bases
        const tbProj = (parseFloat(p.proj_h) || 0) + (parseFloat(p.proj_hr) || 0);
        if (tbProj >= 0.8) {
          const line = 1.5;
          const conf = calcConfidence(tbProj, line, tbProj * 0.5);
          const hr   = calcHitRate(tbProj, line, tbProj * 0.5);
          picks.push({
            player: name, team, game, stat: 'Total Bases',
            line, direction: tbProj > line ? 'over' : 'under',
            odds: americanOdds(hr / 100),
            confidence: parseFloat(conf.toFixed(1)),
            hitRate: hr,
            projection: parseFloat(tbProj.toFixed(1)),
          });
        }

        // Home runs (only project if >= 0.15)
        const hrProj = parseFloat(p.proj_hr) || 0;
        if (hrProj >= 0.15) {
          const line = 0.5;
          const conf = calcConfidence(hrProj, line, hrProj * 0.8);
          const hr   = calcHitRate(hrProj, line, hrProj * 0.8);
          picks.push({
            player: name, team, game, stat: 'Home Runs',
            line, direction: 'over',
            odds: americanOdds(hr / 100),
            confidence: parseFloat(conf.toFixed(1)),
            hitRate: hr,
            projection: parseFloat(hrProj.toFixed(1)),
          });
        }

        // RBIs
        const rbiProj = parseFloat(p.proj_rbi) || 0;
        if (rbiProj >= 0.4) {
          const line = 0.5;
          const conf = calcConfidence(rbiProj, line, rbiProj * 0.6);
          const hr   = calcHitRate(rbiProj, line, rbiProj * 0.6);
          picks.push({
            player: name, team, game, stat: 'RBIs',
            line, direction: 'over',
            odds: americanOdds(hr / 100),
            confidence: parseFloat(conf.toFixed(1)),
            hitRate: hr,
            projection: parseFloat(rbiProj.toFixed(1)),
          });
        }
      }
    }

    // Sort by confidence desc, cap at 100 picks
    picks.sort((a, b) => b.confidence - a.confidence);
    return NextResponse.json(picks.slice(0, 100));

  } catch (e: any) {
    console.error('Props error:', e.message);
    return NextResponse.json([]);
  }
}
