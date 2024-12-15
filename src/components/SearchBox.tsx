"use client"

import { useState } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Search, Loader2, Filter, Calendar as CalendarIcon } from "lucide-react"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Label } from "./ui/label"
import { DayPicker } from "react-day-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { Slider } from "./ui/slider"

export type DetaineeStatus = 'missing' | 'released' | 'deceased';
export type DetaineeGender = 'male' | 'female' | 'other';

export interface SearchParams {
  searchText?: string
  detentionStartDate?: string
  detentionEndDate?: string
  status?: DetaineeStatus
  location?: string
  gender?: DetaineeGender
  ageMin?: number
  ageMax?: number
}

interface SearchBoxProps {
  onSearchAction: (params: SearchParams) => Promise<void>
  loading?: boolean
}

export function SearchBox({ onSearchAction, loading = false }: SearchBoxProps) {
  const [query, setQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Omit<SearchParams, 'searchText'>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    
    await onSearchAction({
      searchText: query.trim() || undefined,
      ...filters
    })
  }

  const handleFilterChange = (key: keyof Omit<SearchParams, 'searchText'>, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by name, location, or detention facility..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-24"
            disabled={loading}
          />
          <Button 
            type="submit" 
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && "bg-accent")}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status || ""}
              onValueChange={(value) => handleFilterChange('status', value as DetaineeStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any status</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
                <SelectItem value="released">Released</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={filters.gender || ""}
              onValueChange={(value) => handleFilterChange('gender', value as DetaineeGender)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any gender</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="Filter by location"
              value={filters.location || ""}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Detention Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.detentionStartDate && "text-muted-foreground"
                  )}
                >
                  {filters.detentionStartDate ? (
                    format(new Date(filters.detentionStartDate), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DayPicker
                  mode="single"
                  selected={filters.detentionStartDate ? new Date(filters.detentionStartDate) : undefined}
                  onSelect={(date: Date | undefined) => 
                    handleFilterChange('detentionStartDate', date ? format(date, 'yyyy-MM-dd') : undefined)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Detention End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.detentionEndDate && "text-muted-foreground"
                  )}
                >
                  {filters.detentionEndDate ? (
                    format(new Date(filters.detentionEndDate), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DayPicker
                  mode="single"
                  selected={filters.detentionEndDate ? new Date(filters.detentionEndDate) : undefined}
                  onSelect={(date: Date | undefined) => 
                    handleFilterChange('detentionEndDate', date ? format(date, 'yyyy-MM-dd') : undefined)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 col-span-2 md:col-span-3">
            <Label>Age at Detention Range</Label>
            <div className="pt-6">
              <Slider
                defaultValue={[filters.ageMin || 0, filters.ageMax || 120]}
                max={120}
                min={0}
                step={1}
                onValueChange={(value) => {
                  handleFilterChange('ageMin', value[0]);
                  handleFilterChange('ageMax', value[1]);
                }}
                className="relative flex items-center select-none touch-none w-full h-5"
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{filters.ageMin || 0} years</span>
                <span>{filters.ageMax || 120} years</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        Examples: "Ahmad from Damascus", "Sednaya Prison 2012", "Released in Aleppo"
      </div>
    </form>
  )
}
