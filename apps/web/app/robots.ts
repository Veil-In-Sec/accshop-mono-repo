import type { MetadataRoute } from 'next'

import { CONFIG } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  const base = CONFIG.NEXT_PUBLIC_SITE_URL
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/admin/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
