import { ThemeProvider as NextThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { arabic } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";

// Import styles in correct order
import "./globals.css";
import "react-day-picker/dist/style.css";
import "@/styles/calendar.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
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
          </div>
        </NextThemeProvider>
      </body>
    </html>
  );
}
