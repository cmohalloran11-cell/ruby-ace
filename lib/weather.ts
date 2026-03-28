// lib/weather.ts
// Open-Meteo — completely free, no API key needed

import { STADIUM_COORDS } from './mlb-api';

export interface WeatherData {
  temp: number;
  windSpeed: number;
  windDir: string;
  windDeg: number;
  rainPct: number;
  condition: string;
  impact: 'hitter-friendly' | 'pitcher-friendly' | 'neutral' | 'rain-risk';
  impactLabel: string;
  impactColor: string;
}

const WIND_DIRECTIONS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

function degToCompass(deg: number): string {
  return WIND_DIRECTIONS[Math.round(deg / 22.5) % 16];
}

function getWindContext(teamAbbr: string, windDeg: number, windSpeed: number): string {
  // Simplified: determine if wind is blowing in/out based on stadium orientation
  // Most parks face roughly northeast — out to CF is ~45° wind
  const outDeg = 45; // approximate "out to CF" for most parks
  const diff = Math.abs(((windDeg - outDeg + 180) % 360) - 180);
  if (windSpeed < 5) return 'Calm';
  if (diff < 45) return 'Out to CF';
  if (diff > 135) return 'In from CF';
  return windDeg < 180 ? 'Out to RF' : 'Out to LF';
}

function getImpact(temp: number, windSpeed: number, windContext: string, rainPct: number): WeatherData['impact'] {
  if (rainPct > 40) return 'rain-risk';
  if (windContext.includes('Out') && windSpeed > 10) return 'hitter-friendly';
  if (windContext.includes('In') && windSpeed > 8) return 'pitcher-friendly';
  if (temp > 80) return 'hitter-friendly';
  if (temp < 50) return 'pitcher-friendly';
  return 'neutral';
}

const IMPACT_LABELS: Record<WeatherData['impact'], string> = {
  'hitter-friendly': 'Hitter Friendly',
  'pitcher-friendly': 'Pitcher Friendly',
  'neutral': 'Neutral',
  'rain-risk': 'Rain Risk',
};

const IMPACT_COLORS: Record<WeatherData['impact'], string> = {
  'hitter-friendly': '#22c55e',
  'pitcher-friendly': '#3b82f6',
  'neutral': '#94a3b8',
  'rain-risk': '#ef4444',
};

export async function fetchWeatherForTeam(teamAbbr: string, gameTime: string): Promise<WeatherData | null> {
  const coords = STADIUM_COORDS[teamAbbr];
  if (!coords) return null;

  try {
    const date = gameTime.split('T')[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation_probability&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America/New_York&start_date=${date}&end_date=${date}`;

    const res = await fetch(url, { next: { revalidate: 1800 } }); // 30 min cache
    const data = await res.json();

    // Find the hour closest to game time
    const gameHour = new Date(gameTime).getUTCHours();
    const hourIndex = Math.min(gameHour, (data.hourly.time?.length ?? 1) - 1);

    const temp = Math.round(data.hourly.temperature_2m?.[hourIndex] ?? 72);
    const windSpeed = Math.round(data.hourly.windspeed_10m?.[hourIndex] ?? 8);
    const windDeg = Math.round(data.hourly.winddirection_10m?.[hourIndex] ?? 180);
    const rainPct = Math.round(data.hourly.precipitation_probability?.[hourIndex] ?? 0);

    const windDir = getWindContext(teamAbbr, windDeg, windSpeed);
    const impact = getImpact(temp, windSpeed, windDir, rainPct);

    return {
      temp,
      windSpeed,
      windDir,
      windDeg,
      rainPct,
      condition: rainPct > 50 ? 'Rainy' : temp > 80 ? 'Hot' : temp < 50 ? 'Cold' : 'Clear',
      impact,
      impactLabel: IMPACT_LABELS[impact],
      impactColor: IMPACT_COLORS[impact],
    };
  } catch (e) {
    console.error(`Weather fetch failed for ${teamAbbr}:`, e);
    return null;
  }
}

export async function fetchWeatherForAllGames(games: any[]): Promise<Record<number, WeatherData>> {
  const results: Record<number, WeatherData> = {};
  await Promise.all(
    games.map(async (g) => {
      const weather = await fetchWeatherForTeam(g.home.abbr, g.time);
      if (weather) results[g.id] = weather;
    })
  );
  return results;
}
