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
    <header className="sticky top-0 z-50 w-full border-b border-[#4CAF50]/10 bg-[#0f1f0f]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0f1f0f]/60">
      <div className="container flex h-14 items-center justify-between">
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="transition-all hover:text-[#4CAF50] text-[#E0E0E0] font-bold text-base whitespace-nowrap relative group"
          >
            <span>باحث عن المعتقلين</span>
            <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-[#4CAF50] transition-all group-hover:w-full"></span>
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/submit"
              className="transition-all hover:text-[#4CAF50] text-[#E0E0E0] relative group"
            >
              <span>تقديم معلومات</span>
              <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-[#4CAF50] transition-all group-hover:w-full"></span>
            </Link>
            <Link
              href="/upload"
              className="transition-all hover:text-[#4CAF50] text-[#E0E0E0] relative group"
            >
              <span>تحميل ملف</span>
              <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-[#4CAF50] transition-all group-hover:w-full"></span>
            </Link>
            <Link
              href="/about"
              className="transition-all hover:text-[#4CAF50] text-[#E0E0E0] relative group"
            >
              <span>حول</span>
              <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-[#4CAF50] transition-all group-hover:w-full"></span>
            </Link>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-[#E0E0E0] hover:text-[#4CAF50] hover:bg-[#4CAF50]/10"
          >
            <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">تبديل السمة</span>
          </Button>

          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-[#E0E0E0] hover:bg-[#4CAF50]/10 hover:text-[#4CAF50] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#4CAF50] md:hidden"
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
          <div className="space-y-3 px-4 pb-3 pt-2 bg-[#0f1f0f]">
            <Link
              href="/submit"
              className="block rounded-md px-4 py-2 text-base font-medium text-[#E0E0E0] hover:bg-[#4CAF50]/10 hover:text-[#4CAF50] transition-all relative group"
            >
              <span>تقديم معلومات</span>
              <span className="absolute bottom-0 right-4 w-0 h-0.5 bg-[#4CAF50] transition-all group-hover:w-[calc(100%-2rem)]"></span>
            </Link>
            <Link
              href="/upload"
              className="block rounded-md px-4 py-2 text-base font-medium text-[#E0E0E0] hover:bg-[#4CAF50]/10 hover:text-[#4CAF50] transition-all relative group"
            >
              <span>تحميل ملف</span>
              <span className="absolute bottom-0 right-4 w-0 h-0.5 bg-[#4CAF50] transition-all group-hover:w-[calc(100%-2rem)]"></span>
            </Link>
            <Link
              href="/about"
              className="block rounded-md px-4 py-2 text-base font-medium text-[#E0E0E0] hover:bg-[#4CAF50]/10 hover:text-[#4CAF50] transition-all relative group"
            >
              <span>حول</span>
              <span className="absolute bottom-0 right-4 w-0 h-0.5 bg-[#4CAF50] transition-all group-hover:w-[calc(100%-2rem)]"></span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
