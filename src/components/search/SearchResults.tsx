import React from 'react';
import { Card } from '@/components/ui/card';
import { useLocale } from 'next-intl';

interface SearchResult {
  id: string;
  full_name_ar?: string;
  full_name_en?: string;
  detention_date?: string;
  detention_location_ar?: string;
  detention_location_en?: string;
  status?: string;
}

interface SearchResultsProps {
  results?: SearchResult[];
  error?: string;
  loading?: boolean;
}

export function SearchResults({ results = [], error, loading }: SearchResultsProps) {
  const locale = useLocale();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div role="alert">Error: {error}</div>;
  }

  if (results.length === 0) {
    return <div>No results found</div>;
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <Card key={result.id} className="p-4">
          <h3 className="text-lg font-semibold">
            {locale === 'ar' 
              ? (result.full_name_ar || result.full_name_en)
              : (result.full_name_en || result.full_name_ar)
            }
          </h3>
          <div className="mt-2 space-y-1">
            {result.detention_date && (
              <p>Detention Date: {result.detention_date}</p>
            )}
            {(result.detention_location_ar || result.detention_location_en) && (
              <p>
                Location:{' '}
                {locale === 'ar'
                  ? (result.detention_location_ar || result.detention_location_en)
                  : (result.detention_location_en || result.detention_location_ar)
                }
              </p>
            )}
            {result.status && <p>Status: {result.status}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}
