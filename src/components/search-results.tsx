"use client"

import React, { useState } from "react"
import { Card } from "../components/ui/card"
import { Pagination } from "../components/ui/pagination"
import type { Detainee } from "../types"

interface SearchResultsProps {
  results: Detainee[]
  isLoading: boolean
}

export function SearchResults({ results, isLoading }: SearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.ceil(results.length / itemsPerPage)

  // Get current items
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = results.slice(indexOfFirstItem, indexOfLastItem)

  const handlePageChange = async (page: number) => {
    setCurrentPage(page)
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse p-6 rounded-lg border border-input bg-card"
            >
              <div className="h-4 bg-muted rounded w-1/4 mb-4" />
              <div className="h-3 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No results found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Found {results.length} results
      </p>
      
      <div className="grid gap-4">
        {currentItems.map((detainee, index) => (
          <Card key={index} className="p-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <h3 className="font-semibold">{detainee.name} {detainee.surname}</h3>
                <span className="text-muted-foreground text-sm">
                  {new Date(detainee.lastUpdated).toLocaleDateString()}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Mother&apos;s Name: {detainee.motherName}</p>
                <p>Last seen in {detainee.lastSeenLocation}</p>
                <p>Status: {detainee.status}</p>
              </div>
              {detainee.physicalDescription && (
                <p className="text-sm mt-2">{detainee.physicalDescription}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChangeAction={handlePageChange}
        />
      )}
    </div>
  )
}
