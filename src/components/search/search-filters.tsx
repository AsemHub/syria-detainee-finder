import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  filter: DetaineeFilter
  onFilterChange: (filter: Partial<DetaineeFilter>) => void
  className?: string
}

export function SearchFilters({
  filter,
  onFilterChange,
  className,
}: SearchFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    filter.startDate ? new Date(filter.startDate) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    filter.endDate ? new Date(filter.endDate) : undefined
  )

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Select
          value={filter.status}
          onValueChange={(value) => onFilterChange({ status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="detained">معتقل</SelectItem>
            <SelectItem value="released">مطلق سراح</SelectItem>
            <SelectItem value="deceased">متوفى</SelectItem>
            <SelectItem value="unknown">غير معروف</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.gender}
          onValueChange={(value) => onFilterChange({ gender: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="الجنس" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">ذكر</SelectItem>
            <SelectItem value="female">أنثى</SelectItem>
            <SelectItem value="other">آخر</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.nationality}
          onValueChange={(value) => onFilterChange({ nationality: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="الجنسية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="syrian">سوري</SelectItem>
            <SelectItem value="palestinian">فلسطيني</SelectItem>
            <SelectItem value="other">آخر</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filter.verified?.toString()}
          onValueChange={(value) =>
            onFilterChange({ verified: value === 'true' })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="حالة التحقق" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">تم التحقق</SelectItem>
            <SelectItem value="false">لم يتم التحقق</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-right font-normal',
                !startDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {startDate ? (
                format(startDate, 'PPP', { locale: ar })
              ) : (
                <span>تاريخ الاعتقال (من)</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => {
                setStartDate(date)
                onFilterChange({ startDate: date?.toISOString() })
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-right font-normal',
                !endDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              {endDate ? (
                format(endDate, 'PPP', { locale: ar })
              ) : (
                <span>تاريخ الاعتقال (إلى)</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => {
                setEndDate(date)
                onFilterChange({ endDate: date?.toISOString() })
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
