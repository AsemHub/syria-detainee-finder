'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'
import { useDebounce } from '@/hooks/use-debounce'
import { useState, useEffect } from 'react'

interface SearchInputProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  onSearch,
  placeholder = 'Search...',
  className,
}: SearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Only use the debounced effect for search
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      onSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    // Immediately trigger search on form submit
    onSearch(searchTerm)
  }

  return (
    <form onSubmit={handleSubmit} className={`relative w-full ${className}`}>
      <Input
        type="search"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pr-10"
      />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </Button>
    </form>
  )
}
