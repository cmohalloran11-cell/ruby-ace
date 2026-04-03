// app/api/contest-sim/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { lineups, contest } = await req.json();

  if (!lineups?.length || !contest) {
    return NextResponse.json({ error: 'Missing lineups or contest data' }, { status: 400 });
  }

  const { entrants, prizePool, prizes } = contest;
  const N_SIM = 10000;

  // For each of our lineups, simulate N_SIM contests
  const results = lineups.map((lineup: any[], li: number) => {
    const myProj = lineup.reduce((s: number, p: any) => s + (p.proj_fpts || 0), 0);
    const myStdDev = myProj * 0.28;

    let cashCount = 0, top1Count = 0, top10Count = 0, top25Count = 0;
    let totalROI = 0;
    const scores: number[] = [];

    for (let sim = 0; sim < N_SIM; sim++) {
      // My score this sim
      const myScore = Math.max(0, myProj + randn() * myStdDev);
      scores.push(myScore);

      // Generate field scores
      const fieldSize = entrants - 1;
      let beatenBy = 0;
      for (let f = 0; f < fieldSize; f++) {
        const fieldProj = 35 + randn() * 8; // typical contest avg
        const fieldScore = Math.max(0, fieldProj + randn() * (fieldProj * 0.3));
        if (fieldScore > myScore) beatenBy++;
      }

      const rank = beatenBy + 1;
      const pct = rank / entrants;

      // Check cash line (top ~18% typically)
      if (pct <= 0.18) cashCount++;
      if (rank === 1) top1Count++;
      if (pct <= 0.10) top10Count++;
      if (pct <= 0.25) top25Count++;

      // Calculate prize
      const prize = getPrize(rank, entrants, prizes, prizePool);
      totalROI += prize;
    }

    scores.sort((a, b) => a - b);
    const avgROI = totalROI / N_SIM;
    const entryFee = contest.entryFee || 0.10;

    return {
      lineupIndex: li,
      projScore: myProj.toFixed(1),
      cashRate: (cashCount / N_SIM * 100).toFixed(1),
      top1Rate: (top1Count / N_SIM * 100).toFixed(3),
      top10Rate: (top10Count / N_SIM * 100).toFixed(1),
      top25Rate: (top25Count / N_SIM * 100).toFixed(1),
      avgPrize: avgROI.toFixed(2),
      roi: ((avgROI / entryFee - 1) * 100).toFixed(1),
      p10Score: scores[Math.floor(N_SIM * 0.10)].toFixed(1),
      p50Score: scores[Math.floor(N_SIM * 0.50)].toFixed(1),
      p90Score: scores[Math.floor(N_SIM * 0.90)].toFixed(1),
    };
  });

  return NextResponse.json({ results, simCount: N_SIM });
}

function randn(): number {
  // Box-Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function getPrize(rank: number, entrants: number, prizes: any[], prizePool: number): number {
  if (!prizes?.length) {
    // Default: top 18% cash at 2x entry fee
    const cashLine = Math.floor(entrants * 0.18);
    return rank <= cashLine ? prizePool / cashLine : 0;
  }
  // Find prize tier
  for (const tier of prizes) {
    if (rank >= tier.minRank && rank <= tier.maxRank) return tier.prize;
  }
  return 0;
}
