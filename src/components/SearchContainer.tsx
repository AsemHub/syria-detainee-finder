"use client"

import { useState, useCallback } from 'react';
import { SearchBox } from './SearchBox';
import type { Database } from '@/lib/database.types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Building2, User, User2, FileText, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';

type Detainee = Database['public']['Tables']['detainees']['Row']

interface SearchState {
    results: Detainee[];
    totalCount: number | null;
    hasNextPage: boolean;
    lastCursor: {
        id: string;
        rank: number;
        date: string;
    } | null;
    seenIds: Set<string>;
}

function getStatusVariant(status: string): "default" | "secondary" | "success" | "destructive" | "warning" | "deceased" {
    switch (status.toLowerCase()) {
        case 'missing':
            return 'destructive';
        case 'in_custody':
            return 'warning';
        case 'deceased':
            return 'deceased';
        case 'released':
            return 'success';
        case 'unknown':
            return 'secondary';
        default:
            return 'default';
    }
}

function getStatusDisplay(status: string): string {
    switch (status.toLowerCase()) {
        case 'in_custody':
            return 'In Custody';
        case 'missing':
            return 'Missing';
        case 'released':
            return 'Released';
        case 'unknown':
            return 'Unknown';
        default:
            return status.charAt(0).toUpperCase() + status.slice(1);
    }
}

export function SearchContainer() {
    const [searchState, setSearchState] = useState<SearchState>({
        results: [],
        totalCount: null,
        hasNextPage: false,
        lastCursor: null,
        seenIds: new Set<string>()
    });
    const [currentSearch, setCurrentSearch] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchVersion, setSearchVersion] = useState(0);

    const performSearch = async (searchText: string, cursor?: SearchState['lastCursor']) => {
        const isLoadingMore = !!cursor;
        
        if ((isLoadingMore && loadingMore) || (!isLoadingMore && loading)) {
            return;
        }

        const currentVersion = searchVersion;
        
        if (isLoadingMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setSearchVersion(v => v + 1);
            setSearchState(prev => ({ 
                ...prev, 
                results: [],
                seenIds: new Set<string>() 
            }));
        }
        
        setError(null);
        
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    searchText,
                    cursor,
                    estimateTotal: !isLoadingMore
                })
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (currentVersion !== searchVersion && !isLoadingMore) {
                return;
            }

            setSearchState(prev => {
                const newSeenIds = new Set([...prev.seenIds]);
                const filteredResults = data.data.filter((result: any) => {
                    if (newSeenIds.has(result.id)) {
                        return false;
                    }
                    newSeenIds.add(result.id);
                    return true;
                });

                return {
                    results: isLoadingMore ? [...prev.results, ...filteredResults] : filteredResults,
                    totalCount: data.metadata?.totalCount ?? null,
                    hasNextPage: data.metadata?.hasNextPage ?? false,
                    lastCursor: data.metadata?.lastCursor ?? null,
                    seenIds: newSeenIds
                };
            });

        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
            if (isLoadingMore) {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    };

    const handleSearchAction = useCallback(async (searchText: string) => {
        setCurrentSearch(searchText);
        await performSearch(searchText);
    }, []);

    const loadMore = useCallback(async () => {
        if (searchState.hasNextPage && !loadingMore && currentSearch) {
            await performSearch(currentSearch, searchState.lastCursor);
        }
    }, [searchState.hasNextPage, loadingMore, currentSearch, searchState.lastCursor]);

    return (
        <div className="w-full max-w-3xl mx-auto space-y-4">
            <SearchBox onSearchAction={handleSearchAction} loading={loading} />

            {error && (
                <div className="text-red-500 text-center p-4">
                    {error}
                </div>
            )}

            {searchState.results.length > 0 ? (
                <div className="space-y-4">
                    <div className="text-sm text-gray-500">
                        {searchState.totalCount !== null ? (
                            `Found ${searchState.totalCount} total results`
                        ) : (
                            `Showing ${searchState.results.length} results`
                        )}
                        {searchState.hasNextPage && ' (scroll for more)'}
                    </div>
                    
                    <div className="space-y-2">
                        {searchState.results.map((result, index) => (
                            <div key={`${result.id}-${index}`} 
                                className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                {/* Header with Name and Status */}
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg font-semibold">{result.fullName}</h3>
                                    </div>
                                    <Badge 
                                        variant={getStatusVariant(result.status)}
                                    >
                                        {getStatusDisplay(result.status)}
                                    </Badge>
                                </div>

                                {/* Main Information */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <User2 className="w-4 h-4" />
                                        <span>{result.gender || 'Unknown'}</span>
                                        {result.ageAtDetention && (
                                            <span>• Age: {result.ageAtDetention}</span>
                                        )}
                                    </div>

                                    {result.dateOfDetention && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            <span>{format(new Date(result.dateOfDetention), 'MMMM d, yyyy')}</span>
                                        </div>
                                    )}

                                    {result.lastSeenLocation && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="w-4 h-4" />
                                            <span>{result.lastSeenLocation}</span>
                                        </div>
                                    )}

                                    {result.detentionFacility && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Building2 className="w-4 h-4" />
                                            <span>{result.detentionFacility}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Information */}
                                {(result.physicalDescription || result.additionalNotes) && (
                                    <div className="mt-3 pt-3 border-t space-y-2">
                                        {result.physicalDescription && (
                                            <div className="text-sm">
                                                <span className="font-medium">Physical Description:</span>
                                                <p className="text-muted-foreground mt-1">{result.physicalDescription}</p>
                                            </div>
                                        )}
                                        {result.additionalNotes && (
                                            <div className="text-sm">
                                                <span className="font-medium">Additional Notes:</span>
                                                <p className="text-muted-foreground mt-1">{result.additionalNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Footer with Contact and Dates */}
                                <div className="mt-3 pt-3 border-t flex flex-wrap justify-between items-center gap-2">
                                    {result.contactInfo && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4" />
                                            <span>{result.contactInfo}</span>
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        {result.lastUpdateDate && (
                                            <>Updated: {format(new Date(result.lastUpdateDate), 'MMMM d, yyyy')}</>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {(searchState.hasNextPage || loadingMore) && (
                        <div className="flex justify-center pt-4">
                            <Button
                                onClick={loadMore}
                                disabled={loading || loadingMore}
                                variant="outline"
                            >
                                {loadingMore ? 'Loading more...' : 'Load More'}
                            </Button>
                        </div>
                    )}
                </div>
            ) : !loading && (
                <div className="text-center py-8 text-gray-500">
                    No results found
                </div>
            )}
        </div>
    );
}
