"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ar } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      dir="rtl"
      locale={ar}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-[280px]",
        months: "flex flex-col",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center px-10",
        caption_label: "text-sm font-normal",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "grid grid-cols-7 gap-1",
        head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] text-center",
        row: "grid grid-cols-7 gap-1 mt-2",
        cell: "text-center text-sm relative p-0 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-transparent"
        ),
        day_selected: "bg-primary text-primary-foreground",
        day_today: "text-primary",
        day_outside: "text-muted-foreground/50",
        day_disabled: "text-muted-foreground/50",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4 text-muted-foreground/70" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4 text-muted-foreground/70" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
