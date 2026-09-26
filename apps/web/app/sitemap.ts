import type { MetadataRoute } from 'next'

import { CONFIG } from '@/lib/config'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = CONFIG.NEXT_PUBLIC_SITE_URL
  const now = new Date()
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]
}
