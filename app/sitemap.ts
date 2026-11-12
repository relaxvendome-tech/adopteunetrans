import type { MetadataRoute } from 'next';
import { PREFECTURES, SITE } from '@/lib/data';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, priority: 1 },
    { url: `${SITE.url}/rencontre-trans`, priority: 0.8 },
    ...PREFECTURES.filter((p) => p.priorite.startsWith('1')).map((p) => ({ url: SITE.url + p.url, priority: 0.7 })),
  ];
}
