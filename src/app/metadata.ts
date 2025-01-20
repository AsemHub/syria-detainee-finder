import { Metadata } from "next"

export const siteConfig = {
  name: "ابحث عن المفقودين والمغيبين قسراً في سوريا أو قدم أي معلومات عنهم",
  description: "شارك هي منصة إنسانية مخصصة للحصول على أو توفير معلومات عن المفقودين والمغيبين قسراً والمعتقلين في سوريا",
  keywords: [
    "Syria",
    "detainees",
    "humanitarian",
    "missing persons",
    "forcibly disappeared",
    "المغيبين قسراً",
    "المفقودين",
    "المعتقلين",
    "human rights",
    "families",
    "search",
    "documentation",
  ],
  authors: [
    {
      name: "Syria Detainee Finder Team",
      url: "https://github.com/yourusername/syria-detainee-finder",
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: siteConfig.authors,
  creator: "Syria Detainee Finder Team",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "./",
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    creator: "@SyriaDetaineeFinder",
  },
}
