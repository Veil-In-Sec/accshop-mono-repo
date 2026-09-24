import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { MotionProvider } from '@/components/motion-provider'
import { LenisProvider } from '@/components/lenis-provider'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})
const _jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Buy Hotmail & Gmail Accounts – Instant Delivery | AccShop',
  description:
    'Buy verified Hotmail, Outlook & Gmail accounts with instant delivery, 48-hour warranty and 24/7 human support. No personal data required. Shop now.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'AccShop',
    title: 'Buy Hotmail & Gmail Accounts – Instant Delivery | AccShop',
    description:
      'Buy verified Hotmail, Outlook & Gmail accounts with instant delivery, 48-hour warranty and 24/7 human support. No personal data required. Shop now.',
    images: [
      {
        url: '/accshop-icon.svg',
        width: 1200,
        height: 630,
        alt: 'AccShop — verified Hotmail, Outlook and Gmail accounts with instant delivery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buy Hotmail & Gmail Accounts – Instant Delivery | AccShop',
    description:
      'Buy verified Hotmail, Outlook & Gmail accounts with instant delivery, 48-hour warranty and 24/7 human support. No personal data required. Shop now.',
    images: [
      '/accshop-icon.svg',
    ],
  },
  icons: {
    icon: [
      {
        url: '/accshop-icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/accshop-icon.svg',
  },
}

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AccShop',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/accshop-icon.svg`,
  sameAs: [],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: 'en',
    },
  ],
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AccShop',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#131316',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
      <html lang="en" className={`dark bg-background ${outfit.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }} suppressHydrationWarning>
        <MotionProvider>
          <LenisProvider>{children}</LenisProvider>
        </MotionProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <Toaster position="bottom-right" richColors theme="dark" />
      </body>
    </html>
  )
}
