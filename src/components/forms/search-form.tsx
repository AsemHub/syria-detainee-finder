"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Search } from "lucide-react"
import type { SearchFormData } from "@/app/actions"

export function SearchForm({ action }: { action: (data: SearchFormData) => Promise<any> }) {
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false)
  const { register, handleSubmit } = useForm<SearchFormData>()

  return (
    <form onSubmit={handleSubmit(action)} className="w-full max-w-4xl mx-auto space-y-4">
      {/* Quick Search */}
      <div className="relative">
        <input
          type="text"
          {...register("name")}
          placeholder="Enter detainee's name..."
          className="w-full h-12 pl-4 pr-12 rounded-lg border border-input bg-background text-foreground"
        />
        <Search className="absolute right-4 top-3 h-6 w-6 text-muted-foreground" />
      </div>

      {/* Advanced Search Toggle */}
      <button
        type="button"
        onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
        className="text-sm text-muted-foreground hover:text-accent"
      >
        {isAdvancedSearch ? "Simple Search" : "Advanced Search"}
      </button>

      {/* Advanced Search Fields */}
      {isAdvancedSearch && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Surname</label>
            <input
              type="text"
              {...register("surname")}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Mother's Name</label>
            <input
              type="text"
              {...register("motherName")}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Seen Location</label>
            <input
              type="text"
              {...register("lastSeenLocation")}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Seen Date</label>
            <input
              type="date"
              {...register("lastSeenDate")}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            />
          </div>
          
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Physical Description</label>
            <textarea
              {...register("physicalDescription")}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background resize-none"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 rounded-lg bg-gradient-green text-white hover:bg-gradient-green-dark transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  )
}
