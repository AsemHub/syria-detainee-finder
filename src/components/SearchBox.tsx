"use client"

import { useState, useCallback } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Search, Loader2 } from "lucide-react"

interface SearchBoxProps {
    onSearchAction: (searchText: string) => Promise<void>
    loading?: boolean
}

export function SearchBox({ onSearchAction, loading = false }: SearchBoxProps) {
    const [query, setQuery] = useState("")
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault()
        setError(null)

        if (!query.trim()) {
            setError("Please enter a search term")
            return
        }

        try {
            await onSearchAction(query.trim())
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unexpected error occurred')
        }
    }, [query, onSearchAction])

    return (
        <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Search by name or location..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Searching...
                        </>
                    ) : (
                        <>
                            <Search className="mr-2 h-4 w-4" />
                            Search
                        </>
                    )}
                </Button>
            </div>

            {error && (
                <div className="text-red-500 text-sm">
                    {error}
                </div>
            )}
        </form>
    )
}
