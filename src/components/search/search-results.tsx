import { DetaineeSearchResult } from '@/lib/types/detainees'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

interface SearchResultsProps {
  results: DetaineeSearchResult[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  className?: string
}

const statusColors = {
  detained: 'bg-red-500',
  released: 'bg-green-500',
  deceased: 'bg-gray-500',
  unknown: 'bg-yellow-500',
} as const

export function SearchResults({
  results,
  loading,
  hasMore,
  onLoadMore,
  className,
}: SearchResultsProps) {
  if (loading && results.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        لم يتم العثور على نتائج
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <Card key={result.detainee.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <Badge
                  variant="secondary"
                  className={statusColors[result.detainee.status]}
                >
                  {result.detainee.status === 'detained' && 'معتقل'}
                  {result.detainee.status === 'released' && 'مطلق سراح'}
                  {result.detainee.status === 'deceased' && 'متوفى'}
                  {result.detainee.status === 'unknown' && 'غير معروف'}
                </Badge>
                {result.detainee.verified && (
                  <Badge variant="secondary" className="bg-blue-500">
                    تم التحقق
                  </Badge>
                )}
              </div>
              <CardTitle className="text-right">
                {result.detainee.full_name_ar}
              </CardTitle>
              {result.detainee.full_name_en && (
                <CardDescription className="text-right">
                  {result.detainee.full_name_en}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-right">
              {result.detainee.date_of_birth && (
                <p>
                  <span className="font-semibold">تاريخ الميلاد: </span>
                  {format(new Date(result.detainee.date_of_birth), 'PPP', {
                    locale: ar,
                  })}
                </p>
              )}
              {result.detainee.detention_date && (
                <p>
                  <span className="font-semibold">تاريخ الاعتقال: </span>
                  {format(new Date(result.detainee.detention_date), 'PPP', {
                    locale: ar,
                  })}
                </p>
              )}
              {result.detainee.detention_location_ar && (
                <p>
                  <span className="font-semibold">مكان الاعتقال: </span>
                  {result.detainee.detention_location_ar}
                </p>
              )}
              {result.detainee.last_seen_date && (
                <p>
                  <span className="font-semibold">تاريخ آخر مشاهدة: </span>
                  {format(new Date(result.detainee.last_seen_date), 'PPP', {
                    locale: ar,
                  })}
                </p>
              )}
              {result.detainee.last_seen_location_ar && (
                <p>
                  <span className="font-semibold">مكان آخر مشاهدة: </span>
                  {result.detainee.last_seen_location_ar}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={onLoadMore}
            disabled={loading}
            variant="outline"
            size="lg"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              'تحميل المزيد'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
