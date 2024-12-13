'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { ModeToggle } from '@/components/mode-toggle'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-lg font-bold text-primary dark:text-primary">
              Syria Detainee Finder
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <nav className="flex items-center space-x-6">
            <Link
              href="/search"
              className="hover-effect text-sm font-medium transition-colors"
            >
              Search
            </Link>
            <Link
              href="/submit"
              className="hover-effect text-sm font-medium transition-colors"
            >
              Submit Information
            </Link>
            <Link
              href="/bulk-upload"
              className="hover-effect text-sm font-medium transition-colors"
            >
              Bulk Upload
            </Link>
            <Link
              href="/about"
              className="hover-effect text-sm font-medium transition-colors"
            >
              About
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <ModeToggle />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center space-x-4">
          <ModeToggle />
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-accent rounded-md"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="flex flex-col space-y-4 p-4">
            <Link
              href="/search"
              className="hover-effect text-sm font-medium transition-colors px-2 py-1.5 rounded-md hover:bg-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Search
            </Link>
            <Link
              href="/submit"
              className="hover-effect text-sm font-medium transition-colors px-2 py-1.5 rounded-md hover:bg-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Submit Information
            </Link>
            <Link
              href="/bulk-upload"
              className="hover-effect text-sm font-medium transition-colors px-2 py-1.5 rounded-md hover:bg-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              Bulk Upload
            </Link>
            <Link
              href="/about"
              className="hover-effect text-sm font-medium transition-colors px-2 py-1.5 rounded-md hover:bg-accent"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
