"use client"

import { useState } from 'react';
import { SearchBox, SearchParams } from './SearchBox';
import type { Database } from '@/lib/database.types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Building2, User } from 'lucide-react';
import { format } from 'date-fns';

type Detainee = Database['public']['Tables']['detainees']['Row'];

export function SearchContainer() {
    const [results, setResults] = useState<Detainee[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearchAction = async (params: SearchParams, signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        
        try {
            const searchParams = new URLSearchParams();
            
            if (params.searchText) searchParams.set('q', params.searchText);
            if (params.detentionStartDate) searchParams.set('startDate', params.detentionStartDate);
            if (params.detentionEndDate) searchParams.set('endDate', params.detentionEndDate);
            if (params.status) searchParams.set('status', params.status);
            if (params.location) searchParams.set('location', params.location);
            if (params.gender) searchParams.set('gender', params.gender);
            if (params.ageMin !== undefined) searchParams.set('ageMin', params.ageMin.toString());
            if (params.ageMax !== undefined) searchParams.set('ageMax', params.ageMax.toString());
            
            const response = await fetch(`/api/search?${searchParams}`, {
                signal,
                next: {
                    revalidate: 0
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Search failed');
            }

            const data = await response.json();
            console.log('Search successful:', {
                params: params,
                results: data.results.length
            });
            
            setResults(data.results);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                // Ignore aborted requests
                return;
            }
            console.error('Search error:', err);
            setError(err instanceof Error ? err.message : 'Failed to perform search');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <SearchBox onSearchAction={handleSearchAction} loading={loading} />
            
            {error && (
                <div className="p-4 text-red-500 bg-red-50 rounded-lg">
                    {error}
                </div>
            )}
            
            <div className="space-y-4">
                {results.map((detainee) => (
                    <Card key={detainee.id}>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">
                                        {detainee.full_name}
                                    </h3>
                                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        Last seen: {detainee.last_seen_location}
                                    </div>
                                </div>
                                <Badge variant={
                                    detainee.status === 'missing' ? 'destructive' :
                                    detainee.status === 'released' ? 'success' :
                                    'secondary'
                                }>
                                    {detainee.status.charAt(0).toUpperCase() + detainee.status.slice(1)}
                                </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-2">
                                    <div className="flex items-center text-sm">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        <span>
                                            Detention Date: {detainee.date_of_detention ? 
                                                format(new Date(detainee.date_of_detention), 'PP') :
                                                'Unknown'
                                            }
                                        </span>
                                    </div>
                                    {detainee.detention_facility && (
                                        <div className="flex items-center text-sm">
                                            <Building2 className="w-4 h-4 mr-2" />
                                            <span>Facility: {detainee.detention_facility}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {detainee.age_at_detention && (
                                        <div className="flex items-center text-sm">
                                            <User className="w-4 h-4 mr-2" />
                                            <span>Age at Detention: {detainee.age_at_detention}</span>
                                        </div>
                                    )}
                                    {detainee.physical_description && (
                                        <div className="text-sm">
                                            <span className="font-medium">Description: </span>
                                            {detainee.physical_description}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {detainee.search_rank > 0 && (
                                <div className="mt-4 text-sm text-muted-foreground">
                                    Match score: {Math.round(detainee.search_rank * 100)}%
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
                
                {results.length === 0 && !loading && !error && (
                    <div className="text-center p-8 text-muted-foreground">
                        No results found. Try adjusting your search terms or filters.
                    </div>
                )}
            </div>
        </div>
    );
}
