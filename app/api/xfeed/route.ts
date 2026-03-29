// app/api/xfeed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const revalidate = 120;

const parser = new Parser();

const NITTER_INSTANCES = [
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
  'https://nitter.cz',
  'https://nitter.space',
];

export async function GET(request: NextRequest) {
  const handle = request.nextUrl.searchParams.get('handle') || 'UnderdogMLB';

  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/${handle}/rss`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)' },
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const xml = await res.text();
      const feed = await parser.parseString(xml);

      const items = (feed.items || []).slice(0, 20).map((item: any) => ({
        id: item.guid || item.link || String(Math.random()),
        text: (item.contentSnippet || item.content || item.title || '')
          .replace(/<[^>]+>/g, '')
          .replace(/\n\n+/g, '\n')
          .trim(),
        url: (item.link || '').replace(/nitter\.[^/]+/, 'twitter.com'),
        published: item.pubDate || new Date().toISOString(),
      }));

      return NextResponse.json({ items, source: instance });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ items: [], error: 'unavailable' });
}
