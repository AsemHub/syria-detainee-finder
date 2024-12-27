"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { DetaineeGender } from '@/lib/database.types'
import { cn } from '@/lib/utils'

export interface SearchFilters {
  status?: string
  gender?: DetaineeGender
  dateFrom?: string
  dateTo?: string
  ageMin?: number
  ageMax?: number
  location?: string
  facility?: string
}

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
}

interface SimpleSelectProps {
  value?: string
  onChange: (value: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}

function SimpleSelect({ value, onChange, placeholder, options }: SimpleSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>{options.find(opt => opt.value === value)?.label || placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {options.map((option) => (
            <button
              key={option.value}
              className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                value === option.value && "bg-accent text-accent-foreground"
              )}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    let processedValue = value;
    
    // Handle empty values for number inputs
    if (typeof value === 'number' && isNaN(value)) {
      processedValue = undefined;
    }
    
    // Handle empty values for date inputs
    if (typeof value === 'string' && value.trim() === '') {
      processedValue = undefined;
    }

    const newFilters = { ...localFilters, [key]: processedValue }
    setLocalFilters(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(localFilters)
    setIsSheetOpen(false)
  }

  const clearFilters = () => {
    const emptyFilters: SearchFilters = {
      status: undefined,
      gender: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      ageMin: undefined,
      ageMax: undefined,
      location: undefined,
      facility: undefined
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  }

  const statusOptions = [
    { value: 'in_custody', label: 'قيد الاعتقال' },
    { value: 'missing', label: 'مفقود' },
    { value: 'released', label: 'محرر' },
    { value: 'deceased', label: 'متوفى' },
    { value: 'unknown', label: 'غير معروف' }
  ]

  const genderOptions = [
    { value: 'male', label: 'ذكر' },
    { value: 'female', label: 'أنثى' }
  ]

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          فلترة النتائج
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[300px] sm:w-[400px]" side="left">
        <div dir="rtl">
          <SheetHeader>
            <SheetTitle>خيارات البحث</SheetTitle>
            <SheetDescription>
              استخدم الفلاتر لتضييق نطاق البحث
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <SimpleSelect
                value={localFilters.status}
                onChange={(value) => handleFilterChange('status', value)}
                placeholder="اختر الحالة"
                options={statusOptions}
              />
            </div>

            <div className="space-y-2">
              <Label>الجنس</Label>
              <SimpleSelect
                value={localFilters.gender}
                onChange={(value) => handleFilterChange('gender', value as DetaineeGender)}
                placeholder="اختر الجنس"
                options={genderOptions}
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ الاعتقال</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">من</Label>
                  <Input
                    type="date"
                    value={localFilters.dateFrom ?? ''}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">إلى</Label>
                  <Input
                    type="date"
                    value={localFilters.dateTo ?? ''}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>العمر عند الاعتقال</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">من</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={localFilters.ageMin ?? ''}
                    onChange={(e) => handleFilterChange('ageMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <Label className="text-xs">إلى</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={localFilters.ageMax ?? ''}
                    onChange={(e) => handleFilterChange('ageMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>آخر موقع معروف</Label>
              <Input
                type="text"
                value={localFilters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                placeholder="المدينة أو المنطقة"
              />
            </div>

            <div className="space-y-2">
              <Label>مكان الاحتجاز</Label>
              <Input
                type="text"
                value={localFilters.facility}
                onChange={(e) => handleFilterChange('facility', e.target.value)}
                placeholder="السجن أو المعتقل"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={applyFilters}>
                تطبيق الفلاتر
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                مسح
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
