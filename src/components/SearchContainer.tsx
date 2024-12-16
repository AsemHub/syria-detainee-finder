"use client"

import { useState } from 'react';
import { SearchBox } from './SearchBox';
import type { Database } from '@/lib/database.types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Building2, User } from 'lucide-react';
import { format } from 'date-fns';

type Detainee = Database['public']['Tables']['detainees']['Row']

export function SearchContainer() {
    const [results, setResults] = useState<Detainee[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearchAction = async (searchText: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ searchText }),
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            setResults(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error handling search results:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            <SearchBox onSearchAction={handleSearchAction} loading={loading} />
            
            {error && (
                <div className="text-red-500 text-center">
                    {error}
                </div>
            )}

            {results && results.length > 0 ? (
                <div className="space-y-4">
                    {results.map((detainee) => (
                        <Card key={detainee.id}>
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-4">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-xl font-semibold">{detainee.full_name}</h3>
                                        <Badge variant={
                                            detainee.status === 'missing' ? 'destructive' :
                                            detainee.status === 'released' ? 'success' : 'secondary'
                                        }>
                                            {detainee.status.charAt(0).toUpperCase() + detainee.status.slice(1)}
                                        </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {detainee.date_of_detention && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>Detained: {format(new Date(detainee.date_of_detention), 'PP')}</span>
                                            </div>
                                        )}
                                        
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            <span>Last seen: {detainee.last_seen_location}</span>
                                        </div>
                                        
                                        {detainee.detention_facility && (
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                <span>Facility: {detainee.detention_facility}</span>
                                            </div>
                                        )}
                                        
                                        {detainee.age_at_detention && (
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>Age at detention: {detainee.age_at_detention}</span>
                                            </div>
                                        )}

                                        {detainee.gender && (
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>Gender: {detainee.gender}</span>
                                            </div>
                                        )}

                                        {detainee.last_update_date && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>Last updated: {format(new Date(detainee.last_update_date), 'PP')}</span>
                                            </div>
                                        )}
                                    </div>

                                    {detainee.physical_description && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-semibold mb-2">Physical Description</h4>
                                            <p className="text-muted-foreground">{detainee.physical_description}</p>
                                        </div>
                                    )}

                                    {detainee.additional_notes && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-semibold mb-2">Additional Notes</h4>
                                            <p className="text-muted-foreground">{detainee.additional_notes}</p>
                                        </div>
                                    )}

                                    {detainee.contact_info && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-semibold mb-2">Contact Information</h4>
                                            <p className="text-muted-foreground">{detainee.contact_info}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : !loading && (
                <div className="text-center text-gray-500">
                    No results found
                </div>
            )}
        </div>
    );
}
