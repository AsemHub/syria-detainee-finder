"use client"

import { useDetaineeSearch } from "@/hooks/use-detainee-search"
import { SearchInput } from "@/components/search/search-input"
import { SearchFilters } from "@/components/search/search-filters"
import { SearchResults } from "@/components/search/search-results"

export default function SearchPage() {
  const {
    results,
    loading,
    hasMore,
    filter,
    updateFilter,
    search,
    loadMore,
  } = useDetaineeSearch()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">البحث عن المعتقلين</h1>
          <p className="text-muted-foreground">
            ابحث في قاعدة البيانات للحصول على معلومات حول المعتقلين السوريين. استخدم خيارات البحث المتقدمة للحصول على نتائج أكثر دقة.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <SearchInput onSearch={search} />
          </div>

          <SearchFilters
            filter={filter}
            onFilterChange={updateFilter}
            className="bg-muted/50 p-4 rounded-lg"
          />

          <SearchResults
            results={results}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            className="mt-8"
          />
        </div>
      </div>
    </div>
  )
}
