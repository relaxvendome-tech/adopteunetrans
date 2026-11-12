import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/data';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/membres', '/messages', '/profil', '/auth'] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
