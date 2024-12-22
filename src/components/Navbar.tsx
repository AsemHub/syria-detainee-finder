"use client"

import Link from "next/link"
import { Button } from "./ui/button"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

export function Navbar() {
  const { theme, setTheme } = useTheme()

  return (
    <nav className="border-b">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="font-semibold">
          باحث عن المعتقلين السوريين
        </Link>
        
        <div className="mr-auto flex items-center gap-4">
          <Link href="/submit">
            <Button variant="ghost">تقديم معلومات</Button>
          </Link>
          <Link href="/upload">
            <Button variant="ghost">تحميل ملف</Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost">حول</Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">تبديل السمة</span>
          </Button>
        </div>
      </div>
    </nav>
  )
}
