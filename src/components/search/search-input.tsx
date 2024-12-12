import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SearchIcon } from '@radix-ui/react-icons'
import { useDebounce } from '@/hooks/use-debounce'

interface SearchInputProps {
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({
  onSearch,
  placeholder = 'البحث عن معتقل...',
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [value, setValue] = useState('')
  
  const debouncedSearch = useDebounce(onSearch, debounceMs)

  const handleSearch = useCallback(() => {
    debouncedSearch(value)
  }, [debouncedSearch, value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  return (
    <div className="flex w-full max-w-sm items-center space-x-2 rtl:space-x-reverse">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="text-right"
      />
      <Button type="submit" onClick={handleSearch}>
        <SearchIcon className="h-4 w-4" />
        <span className="mr-2">بحث</span>
      </Button>
    </div>
  )
}
