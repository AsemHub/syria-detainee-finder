"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from './ui/sheet'
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { DetaineeGender } from '@/lib/database.types'
import { cn } from '@/lib/utils'
import { useToast } from "@/hooks/use-toast"

export interface SearchFilters {
  status?: string
  gender?: DetaineeGender
  dateFrom?: string
  dateTo?: string
  ageMin?: number
  ageMax?: number
  location?: string
  detentionFacility?: string
}

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChangeAction: (filters: SearchFilters) => void
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

export function SearchFilters({ filters, onFiltersChangeAction }: SearchFiltersProps) {
  const { toast } = useToast()
  const [localFilters, setLocalFilters] = useState<SearchFilters>({
    status: filters.status || undefined,
    gender: filters.gender || undefined,
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
    ageMin: filters.ageMin,
    ageMax: filters.ageMax,
    location: filters.location || '',
    detentionFacility: filters.detentionFacility || ''
  });
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    setLocalFilters({
      status: filters.status || undefined,
      gender: filters.gender || undefined,
      dateFrom: filters.dateFrom || '',
      dateTo: filters.dateTo || '',
      ageMin: filters.ageMin,
      ageMax: filters.ageMax,
      location: filters.location || '',
      detentionFacility: filters.detentionFacility || ''
    });
  }, [filters]);

  useEffect(() => {
    const viewport = window.visualViewport;
    
    if (viewport) {
      const handleResize = () => {
        setViewportHeight(viewport.height);
        document.documentElement.style.setProperty('--viewport-height', `${viewport.height}px`);
      };
      
      viewport.addEventListener('resize', handleResize);
      handleResize(); // Initial size
      
      return () => viewport.removeEventListener('resize', handleResize);
    }
  }, []);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    let processedValue = value;
    
    // Handle empty values for number inputs
    if (key === 'ageMin' || key === 'ageMax') {
      if (value === '') {
        processedValue = undefined;
      } else {
        const numValue = parseInt(value);
        processedValue = isNaN(numValue) ? undefined : numValue;
      }
    }
    
    // Handle empty values for text inputs
    if (typeof value === 'string' && key !== 'ageMin' && key !== 'ageMax') {
      processedValue = value.trim() === '' ? '' : value;
    }

    const newFilters = { ...localFilters, [key]: processedValue };
    setLocalFilters(newFilters);
  };

  const applyFilters = useCallback(() => {
    onFiltersChangeAction(localFilters);
    setIsSheetOpen(false);
    toast({
      title: "تم تطبيق الفلاتر",
      description: "تم تحديث نتائج البحث وفقاً للفلاتر المحددة",
      duration: 2000,
    });
  }, [localFilters, onFiltersChangeAction]);

  const clearFilters = () => {
    const emptyFilters: SearchFilters = {
      status: undefined,
      gender: undefined,
      dateFrom: '',
      dateTo: '',
      ageMin: undefined,
      ageMax: undefined,
      location: '',
      detentionFacility: ''
    };
    setLocalFilters(emptyFilters);
    onFiltersChangeAction(emptyFilters);
    toast({
      title: "تم إعادة تعيين الفلاتر",
      description: "تم مسح جميع الفلاتر وتحديث نتائج البحث",
      duration: 2000,
    });
  };

  const statusOptions = [
    { value: 'معتقل', label: 'معتقل' },
    { value: 'مفقود', label: 'مفقود' },
    { value: 'مطلق سراح', label: 'مطلق سراح' },
    { value: 'متوفى', label: 'متوفى' },
    { value: 'مغيب قسراً', label: 'مغيب قسراً' },
    { value: 'غير معروف', label: 'غير معروف' }
  ]

  const genderOptions = [
    { value: 'ذكر', label: 'ذكر' },
    { value: 'أنثى', label: 'أنثى' },
    { value: 'غير معروف', label: 'غير معروف' }
  ]

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.status) count++;
    if (localFilters.gender) count++;
    if (localFilters.dateFrom) count++;
    if (localFilters.dateTo) count++;
    if (localFilters.ageMin !== undefined) count++;
    if (localFilters.ageMax !== undefined) count++;
    if (localFilters.location) count++;
    if (localFilters.detentionFacility) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const filterButtonClass = cn(
    "relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold",
    {
      "bg-primary text-primary-foreground hover:bg-primary/90": activeFiltersCount > 0,
      "bg-secondary text-secondary-foreground hover:bg-secondary/80": activeFiltersCount === 0
    }
  );

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setIsSheetOpen(true)}
        className={filterButtonClass}
      >
        <SlidersHorizontal className="h-4 w-4" />
        فلترة النتائج
        {activeFiltersCount > 0 && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <div />
        </SheetTrigger>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-lg p-0 flex flex-col h-[100svh] overflow-hidden"
          style={{ height: viewportHeight ? `${viewportHeight}px` : '100svh' }}
        >
          {/* Header - Fixed height */}
          <div className="flex-none p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SheetClose className="absolute left-4 top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
            <div className="pr-4">
              <SheetTitle>فلترة النتائج</SheetTitle>
              <SheetDescription>
                استخدم هذه الخيارات لتضييق نطاق البحث
              </SheetDescription>
            </div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <form onSubmit={(e) => {
              e.preventDefault();
              applyFilters();
            }} className="space-y-4 p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <SimpleSelect
                    value={localFilters.status}
                    onChange={(value) => handleFilterChange('status', value)}
                    placeholder="اختر الحالة"
                    options={statusOptions}
                  />
                  <p className="text-sm text-muted-foreground">
                    نعلم أن مصطلحي "معتقل" و"مغيب قسراً" يستخدمان بشكل متبادل في سوريا. يمكنك استخدام أي منهما في البحث وسنقوم بعرض النتائج المتعلقة بكليهما.
                  </p>
                </div>
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
                <Label>تاريخ آخر مشاهدة</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">من</Label>
                    <Input
                      type="date"
                      value={localFilters.dateFrom || ''}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className="touch-manipulation"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">إلى</Label>
                    <Input
                      type="date"
                      value={localFilters.dateTo || ''}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className="touch-manipulation"
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
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={0}
                      max={100}
                      value={localFilters.ageMin ?? ''}
                      onChange={(e) => handleFilterChange('ageMin', e.target.value)}
                      className="touch-manipulation"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">إلى</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={0}
                      max={100}
                      value={localFilters.ageMax ?? ''}
                      onChange={(e) => handleFilterChange('ageMax', e.target.value)}
                      className="touch-manipulation"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>آخر موقع معروف</Label>
                <Input
                  type="text"
                  value={localFilters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  placeholder="المدينة أو المنطقة"
                  className="touch-manipulation"
                />
              </div>

              <div className="space-y-2">
                <Label>مكان الاحتجاز</Label>
                <Input
                  type="text"
                  value={localFilters.detentionFacility || ''}
                  onChange={(e) => handleFilterChange('detentionFacility', e.target.value)}
                  placeholder="السجن أو المعتقل"
                  className="touch-manipulation"
                />
              </div>

              {/* Spacer for bottom buttons */}
              <div className="h-20" />
            </form>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="flex-none border-t bg-background/80 backdrop-blur-sm p-4 sticky bottom-0 z-10">
            <div className="flex gap-3 sm:container sm:mx-auto sm:max-w-sm">
              <Button 
                type="button"
                onClick={clearFilters}
                variant="outline"
                className="flex-1"
              >
                مسح الفلاتر
              </Button>
              <Button 
                type="submit"
                onClick={applyFilters} 
                className="flex-1"
              >
                تطبيق الفلاتر
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
