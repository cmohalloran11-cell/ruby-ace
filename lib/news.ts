// lib/news.ts
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure'],
  },
});

export const TEAM_FEEDS: Record<string, string> = {
  ALL:  'https://www.mlb.com/feeds/news/rss.xml',
  NYY:  'https://www.mlb.com/yankees/news/rss.xml',
  BOS:  'https://www.mlb.com/red-sox/news/rss.xml',
  LAD:  'https://www.mlb.com/dodgers/news/rss.xml',
  SF:   'https://www.mlb.com/giants/news/rss.xml',
  HOU:  'https://www.mlb.com/astros/news/rss.xml',
  ATL:  'https://www.mlb.com/braves/news/rss.xml',
  PHI:  'https://www.mlb.com/phillies/news/rss.xml',
  NYM:  'https://www.mlb.com/mets/news/rss.xml',
  CHC:  'https://www.mlb.com/cubs/news/rss.xml',
  MIL:  'https://www.mlb.com/brewers/news/rss.xml',
  SD:   'https://www.mlb.com/padres/news/rss.xml',
  TEX:  'https://www.mlb.com/rangers/news/rss.xml',
  INJURIES: 'https://www.rotowire.com/baseball/rss-player-news.php',
};

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  published: string;
  team: string;
  tag: 'Injury' | 'Lineup' | 'Rotation' | 'General';
}

function detectTag(title: string, summary: string): NewsItem['tag'] {
  const text = (title + ' ' + summary).toLowerCase();
  if (text.includes('injur') || text.includes('il ') || text.includes('hurt') || text.includes('strain') || text.includes('surgery')) return 'Injury';
  if (text.includes('lineup') || text.includes('starting') || text.includes('batting order')) return 'Lineup';
  if (text.includes('rotation') || text.includes('starter') || text.includes('start sunday')) return 'Rotation';
  return 'General';
}

export async function fetchTeamNews(team: string = 'ALL', limit: number = 20): Promise<NewsItem[]> {
  const feedUrl = TEAM_FEEDS[team] || TEAM_FEEDS.ALL;
  try {
    const feed = await parser.parseURL(feedUrl);
    return feed.items.slice(0, limit).map((item: any) => ({
      id: item.guid || item.link || String(Date.now()),
      title: item.title || '',
      summary: (item.contentSnippet || item.summary || '').slice(0, 300),
      url: item.link || '',
      image: item['media:content']?.$.url || item.enclosure?.url || null,
      published: item.pubDate || new Date().toISOString(),
      team,
      tag: detectTag(item.title || '', item.contentSnippet || ''),
    }));
  } catch (e) {
    console.error(`RSS fetch failed for ${team}:`, e);
    return [];
  }
}

export async function fetchAllNews(limit: number = 30): Promise<NewsItem[]> {
  const [mlbNews, injuryNews] = await Promise.allSettled([
    fetchTeamNews('ALL', limit),
    fetchTeamNews('INJURIES', 10),
  ]);

  const all = [
    ...(mlbNews.status === 'fulfilled' ? mlbNews.value : []),
    ...(injuryNews.status === 'fulfilled' ? injuryNews.value : []),
  ];

  return all
    .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
    .slice(0, limit);
}
