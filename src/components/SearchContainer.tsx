"use client"

import { useState, useCallback } from 'react';
import { SearchBox } from './SearchBox';
import type { Database } from '@/lib/database.types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Building2, User, User2, FileText, Phone, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
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
            return 'قيد الاعتقال';
        case 'missing':
            return 'مفقود';
        case 'released':
            return 'مطلق سراح';
        case 'deceased':
            return 'متوفى';
        case 'unknown':
            return 'غير معروف';
        default:
            return status;
    }
}

export function SearchContainer() {
    const [loading, setLoading] = useState(false);
    const [searchState, setSearchState] = useState<SearchState>({
        results: [],
        totalCount: null,
        hasNextPage: false,
        lastCursor: null,
        seenIds: new Set()
    });
    const [currentQuery, setCurrentQuery] = useState<string>("");

    const handleSearch = useCallback(async (query: string) => {
        setLoading(true);
        setCurrentQuery(query);
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل البحث');
            }

            const data = await response.json();
            
            if (!data.results) {
                throw new Error('لم يتم العثور على نتائج');
            }
            
            setSearchState({
                results: data.results,
                totalCount: data.totalCount,
                hasNextPage: data.hasNextPage,
                lastCursor: data.lastCursor,
                seenIds: new Set(data.results.map((r: Detainee) => r.id))
            });
        } catch (error) {
            console.error('Search error:', error);
            throw new Error('حدث خطأ أثناء البحث');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMore = useCallback(async () => {
        if (!searchState.lastCursor || !searchState.hasNextPage || !currentQuery) return;

        setLoading(true);
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    query: currentQuery,
                    cursor: searchState.lastCursor 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل تحميل المزيد من النتائج');
            }

            const data = await response.json();
            
            if (!data.results) {
                throw new Error('لم يتم العثور على نتائج');
            }
            
            // Filter out any results we've already seen
            const newResults = data.results.filter((r: Detainee) => !searchState.seenIds.has(r.id));
            
            setSearchState(prev => ({
                results: [...prev.results, ...newResults],
                totalCount: data.totalCount,
                hasNextPage: data.hasNextPage,
                lastCursor: data.lastCursor,
                seenIds: new Set([...prev.seenIds, ...newResults.map((r: Detainee) => r.id)])
            }));
        } catch (error) {
            console.error('Load more error:', error);
        } finally {
            setLoading(false);
        }
    }, [searchState.lastCursor, searchState.hasNextPage, searchState.seenIds, currentQuery]);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4" dir="rtl">
            <SearchBox onSearchAction={handleSearch} loading={loading} />

            {searchState.totalCount !== null && (
                <p className="text-sm text-muted-foreground text-right">
                    {searchState.totalCount === 0 ? (
                        'لم يتم العثور على نتائج'
                    ) : (
                        `تم العثور على ${searchState.totalCount} نتيجة`
                    )}
                </p>
            )}

            <div className="space-y-4">
                {searchState.results.map((result) => (
                    <Card key={result.id} className="overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-4">
                                {/* Header with name and status */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <User2 className="w-5 h-5 text-muted-foreground" />
                                        <span className="font-bold text-lg">{result.fullName}</span>
                                    </div>
                                    <Badge variant={getStatusVariant(result.status)} className="mr-auto">
                                        {getStatusDisplay(result.status)}
                                    </Badge>
                                </div>

                                {/* Main information grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Personal Information */}
                                    <div className="space-y-3">
                                        {result.ageAtDetention && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span>العمر عند الاعتقال: {result.ageAtDetention} سنة</span>
                                            </div>
                                        )}
                                        {result.gender && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <User2 className="w-4 h-4 text-muted-foreground" />
                                                <span>الجنس: {result.gender === 'male' ? 'ذكر' : result.gender === 'female' ? 'أنثى' : 'غير محدد'}</span>
                                            </div>
                                        )}
                                        {result.physicalDescription && (
                                            <div className="flex items-start gap-2 text-sm">
                                                <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                                                <span>الوصف الجسدي: {result.physicalDescription}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Location Information */}
                                    <div className="space-y-3">
                                        {result.lastSeenLocation && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                <span>آخر مكان شوهد فيه: {result.lastSeenLocation}</span>
                                            </div>
                                        )}
                                        {result.detentionFacility && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                <span>مركز الاحتجاز: {result.detentionFacility}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dates and Timeline */}
                                <div className="border-t pt-4 space-y-3">
                                    {result.dateOfDetention && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>تاريخ الاعتقال: {format(new Date(result.dateOfDetention), 'dd MMMM yyyy', { locale: ar })}</span>
                                        </div>
                                    )}
                                    {result.lastUpdateDate && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>آخر تحديث: {format(new Date(result.lastUpdateDate), 'dd MMMM yyyy', { locale: ar })}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Contact and Source Information */}
                                <div className="border-t pt-4 space-y-3">
                                    {result.contactInfo && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            <span>معلومات الاتصال: {result.contactInfo}</span>
                                        </div>
                                    )}
                                    {result.sourceOrganization && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                            <span>المنظمة المصدر: {result.sourceOrganization}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Notes */}
                                {result.additionalNotes && (
                                    <div className="border-t pt-4">
                                        <div className="flex items-start gap-2 text-sm">
                                            <Info className="w-4 h-4 text-muted-foreground mt-1" />
                                            <div>
                                                <span className="font-medium block mb-1">ملاحظات إضافية:</span>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{result.additionalNotes}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Record Validation */}
                                {result.recordValidation && (
                                    <div className="bg-accent/5 rounded-lg p-3 text-sm">
                                        <div className="flex items-start gap-2">
                                            <Info className="w-4 h-4 text-accent mt-0.5" />
                                            <span className="text-accent">{result.recordValidation}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {searchState.hasNextPage && (
                <div className="flex justify-center">
                    <Button
                        variant="default"
                        onClick={loadMore}
                        disabled={loading}
                    >
                        {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
                    </Button>
                </div>
            )}
        </div>
    );
}
