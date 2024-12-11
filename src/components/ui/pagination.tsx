"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { ButtonProps, buttonVariants } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChangeAction: (page: number) => Promise<void>
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChangeAction,
}: PaginationProps) {
  const handlePageChange = async (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      await onPageChangeAction(newPage)
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-9 w-9",
          "button-hover"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </button>
      <span className="mx-2">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-9 w-9",
          "button-hover"
        )}
      >
        <span className="sr-only">Next page</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
