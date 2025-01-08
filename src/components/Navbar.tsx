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
      <div className="container flex h-14 max-w-screen-2xl mx-auto">
        <div className="flex w-full items-center justify-between gap-4">
          {/* Left Section - Menu Button (Mobile) */}
          <button
            className="md:hidden -ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">فتح القائمة</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          {/* Center Section - Title */}
          <div className="flex flex-1 items-center justify-center md:justify-start">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-4xl md:text-5xl font-black whitespace-nowrap relative group"
            >
              <span className="bg-gradient-to-b from-[#239F40] from-30% via-[#FF0000] via-45% to-[#000000] to-65% inline-block text-transparent bg-clip-text">شارك</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/submit"
              className="transition-all hover:text-primary text-foreground"
            >
              تقديم معلومات
            </Link>
            <Link
              href="/upload"
              className="transition-all hover:text-primary text-foreground"
            >
              رفع ملف
            </Link>
            <Link
              href="/about"
              className="transition-all hover:text-primary text-foreground"
            >
              حول
            </Link>
          </nav>

          {/* Right Section - Theme Control */}
          <div className="flex items-center -mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-10 w-10 text-foreground hover:text-primary hover:bg-primary/10"
            >
              <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">تبديل السمة</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute w-full bg-background border-b border-border">
          <nav className="container py-2">
            <div className="flex flex-col space-y-3 text-right">
              <Link
                href="/submit"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary transition-all"
              >
                تقديم معلومات
              </Link>
              <Link
                href="/upload"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary transition-all"
              >
                رفع ملف
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-foreground hover:text-primary transition-all"
              >
                حول
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
