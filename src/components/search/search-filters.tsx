'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CalendarIcon } from '@radix-ui/react-icons'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { DetaineeFilter } from '@/lib/types/detainees'

interface SearchFiltersProps {
  onFilterChange: (filters: DetaineeFilter) => void
  className?: string
}

export function SearchFilters({ onFilterChange, className }: SearchFiltersProps) {
  const [date, setDate] = useState<Date>()
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState<string>('')

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    updateFilters({ date: selectedDate })
  }

  const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocation = event.target.value
    setLocation(newLocation)
    updateFilters({ location: newLocation })
  }

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = event.target.value
    setStatus(newStatus)
    updateFilters({ status: newStatus })
  }

  const updateFilters = (updatedFilter: Partial<DetaineeFilter>) => {
    onFilterChange({
      date: date,
      location: location,
      status: status,
      ...updatedFilter,
    })
  }

  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, 'PPP', { locale: ar })
            ) : (
              <span>تاريخ الاعتقال</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <select
        value={location}
        onChange={handleLocationChange}
        className="rounded-md border border-input bg-background px-3 py-2"
      >
        <option value="">المحافظة</option>
        <option value="damascus">دمشق</option>
        <option value="aleppo">حلب</option>
        <option value="homs">حمص</option>
        {/* Add more locations */}
      </select>

      <select
        value={status}
        onChange={handleStatusChange}
        className="rounded-md border border-input bg-background px-3 py-2"
      >
        <option value="">الحالة</option>
        <option value="detained">معتقل</option>
        <option value="released">مفرج عنه</option>
        <option value="deceased">متوفي</option>
        <option value="unknown">غير معروف</option>
      </select>
    </div>
  )
}
