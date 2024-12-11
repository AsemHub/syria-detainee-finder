"use client"

import { useState } from "react"
import { SearchForm } from "@/components/forms/search-form"
import { SearchResults } from "@/components/search-results"
import type { Detainee } from "@/types/detainee"
import { searchAction } from "../actions"

// Temporary mock data for development
const mockResults: Detainee[] = [
  {
    id: "1",
    name: "Ahmad",
    surname: "Al-Hassan",
    motherName: "Fatima",
    lastSeenLocation: "Damascus, Syria",
    lastSeenDate: "2023-06-15",
    physicalDescription: "Height: 175cm, Build: Medium, Hair: Black, Eyes: Brown, Notable Features: Scar on left hand",
    status: "missing" as const,
    lastUpdated: "2023-12-01",
  },
  {
    id: "2",
    name: "Mohammed",
    surname: "Al-Sayyed",
    motherName: "Aisha",
    lastSeenLocation: "Aleppo, Syria",
    lastSeenDate: "2023-08-20",
    physicalDescription: "Height: 180cm, Build: Tall, Hair: Brown, Eyes: Green",
    status: "found" as const,
    lastUpdated: "2023-11-15",
  },
]

export default function SearchPage() {
  const [results, setResults] = useState<Detainee[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearchAction = async (data: any) => {
    setIsLoading(true)
    try {
      const searchResults = await searchAction(data)
      setResults(searchResults)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Search for Detainees</h1>
          <p className="text-muted-foreground">
            Search our database for information about Syrian detainees. Use the advanced search options for more specific results.
          </p>
        </div>

        <SearchForm action={handleSearchAction} />
        <SearchResults results={results} isLoading={isLoading} />
      </div>
    </div>
  )
}
