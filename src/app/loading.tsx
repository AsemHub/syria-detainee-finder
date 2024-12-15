import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function Loading() {
  return (
    <div className="container mx-auto min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner size={32} />
    </div>
  )
}
