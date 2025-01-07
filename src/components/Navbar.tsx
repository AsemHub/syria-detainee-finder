"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "./icons";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { MoonIcon, SunIcon } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="transition-all hover:text-primary text-foreground font-bold text-base whitespace-nowrap relative group"
          >
            <span>الباحث عن المفقودين والمغيبين قسراً</span>
            <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/submit"
              className="transition-all hover:text-primary text-foreground relative group"
            >
              <span>تقديم معلومات</span>
              <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </Link>
            <Link
              href="/upload"
              className="transition-all hover:text-primary text-foreground relative group"
            >
              <span>رفع ملف</span>
              <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </Link>
            <Link
              href="/about"
              className="transition-all hover:text-primary text-foreground relative group"
            >
              <span>حول</span>
              <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
            </Link>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-foreground hover:text-primary hover:bg-primary/10"
          >
            <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">تبديل السمة</span>
          </Button>

          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">فتح القائمة</span>
            {mobileMenuOpen ? (
              <X className="block h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="block h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-3 px-4 pb-3 pt-2 bg-background">
            <Link
              href="/submit"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-md px-4 py-2 text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-all relative group"
            >
              <span>تقديم معلومات</span>
              <span className="absolute bottom-0 right-4 w-0 h-0.5 bg-primary transition-all group-hover:w-[calc(100%-2rem)]"></span>
            </Link>
            <Link
              href="/upload"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-md px-4 py-2 text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-all relative group"
            >
              <span>رفع ملف</span>
              <span className="absolute bottom-0 right-4 w-0 h-0.5 bg-primary transition-all group-hover:w-[calc(100%-2rem)]"></span>
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-md px-4 py-2 text-base font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-all relative group"
            >
              <span>حول</span>
              <span className="absolute bottom-0 right-4 w-0 h-0.5 bg-primary transition-all group-hover:w-[calc(100%-2rem)]"></span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
