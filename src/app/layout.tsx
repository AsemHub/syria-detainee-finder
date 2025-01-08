import { ThemeProvider as NextThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { arabic } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import { TranslationBanner } from "@/components/TranslationBanner";
import { Metadata } from "next"
import { IBM_Plex_Sans_Arabic } from "next/font/google"

// Import styles in correct order
import "./globals.css";
import "react-day-picker/dist/style.css";
import "@/styles/calendar.css";

const font = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={cn("min-h-screen bg-background font-sans antialiased", arabic.variable)}>
        <NextThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <div className="flex-1">{children}</div>
            <Toaster />
            <TranslationBanner />
          </div>
        </NextThemeProvider>
      </body>
    </html>
  );
}
