"use client"

import { useState, useCallback } from 'react';
import { SearchBox } from './SearchBox';
import type { Database, DetaineeGender } from '@/lib/database.types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Building2, User, User2, FileText, Phone, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from './ui/button';

type Detainee = {
    id: string;
    full_name: string;
    last_seen_location: string | null;
    status: string | null;
    gender: DetaineeGender | null;
    age_at_detention: number | null;
    date_of_detention: string | null;
    detention_facility: string | null;
    additional_notes: string | null;
    physical_description: string | null;
    contact_info: string | null;
    last_update_date: string | null;
    created_at: string;
    source_organization?: string;
    source_document_id?: string;
    record_validation?: string;
    record_processing_status?: string;
}

interface SearchState {
    results: Detainee[];
    totalCount: number | null;
    currentPage: number;
    totalPages: number | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    pageSize: number;
    seenIds: Set<string>;
}

// Status mapping between Arabic and English
const STATUS_MAP = {
    // Arabic
    'معتقل': 'in_custody',
    'مفقود': 'missing',
    'محرر': 'released',
    'متوفى': 'deceased',
    'غير معروف': 'unknown',
    // English
    'in_custody': 'in_custody',
    'missing': 'missing',
    'released': 'released',
    'deceased': 'deceased',
    'unknown': 'unknown'
} as const;

type DetaineeStatus = typeof STATUS_MAP[keyof typeof STATUS_MAP];

function normalizeStatus(status: string | null): DetaineeStatus {
    if (!status) return 'unknown';
    return STATUS_MAP[status as keyof typeof STATUS_MAP] || 'unknown';
}

function getStatusVariant(status: string | null): "default" | "secondary" | "success" | "destructive" | "warning" | "deceased" {
    const normalizedStatus = normalizeStatus(status);

    switch (normalizedStatus) {
        case 'missing':
            return 'destructive';
        case 'in_custody':
            return 'warning';
        case 'deceased':
            return 'destructive';
        case 'released':
            return 'success';
        case 'unknown':
            return 'secondary';
        default:
            return 'default';
    }
}

function getStatusDisplay(status: string | null): string {
    const normalizedStatus = normalizeStatus(status);

    switch (normalizedStatus) {
        case 'in_custody':
            return 'قيد الاعتقال';
        case 'missing':
            return 'مفقود';
        case 'released':
            return 'محرر';
        case 'deceased':
            return 'متوفى';
        case 'unknown':
        default:
            return 'غير معروف';
    }
}

export function SearchContainer() {
    const [loading, setLoading] = useState(false);
    const [searchState, setSearchState] = useState<SearchState>({
        results: [],
        totalCount: null,
        currentPage: 1,
        totalPages: null,
        hasNextPage: false,
        hasPreviousPage: false,
        pageSize: 20,
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
                body: JSON.stringify({
                    query,
                    pageSize: 20,
                    pageNumber: 1,
                    estimateTotal: true
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل البحث');
            }

            const data = await response.json();

            console.log('Frontend received data:', {
                totalCount: data.totalCount,
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                hasNextPage: data.hasNextPage,
                hasPreviousPage: data.hasPreviousPage,
                resultCount: data.results?.length
            });

            // Handle empty results gracefully
            if (!data.results || data.results.length === 0) {
                setSearchState({
                    results: [],
                    totalCount: data.totalCount || 0,
                    currentPage: 1,
                    totalPages: data.totalPages || 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                    pageSize: 20,
                    seenIds: new Set()
                });
                return;
            }

            setSearchState({
                results: data.results,
                totalCount: data.totalCount || 0,
                currentPage: data.currentPage || 1,
                totalPages: data.totalPages || 1,
                hasNextPage: data.hasNextPage || false,
                hasPreviousPage: data.hasPreviousPage || false,
                pageSize: data.pageSize || 20,
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
        if (!searchState.hasNextPage || !currentQuery) {
            console.log('LoadMore early return:', {
                hasNextPage: searchState.hasNextPage,
                hasCurrentQuery: !!currentQuery,
                currentPage: searchState.currentPage
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: currentQuery,
                    pageNumber: searchState.currentPage + 1,
                    pageSize: searchState.pageSize,
                    estimateTotal: true
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل تحميل المزيد من النتائج');
            }

            const data = await response.json();

            console.log('LoadMore received data:', {
                totalCount: data.totalCount,
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                hasNextPage: data.hasNextPage,
                hasPreviousPage: data.hasPreviousPage,
                newResultsCount: data.results?.length,
                currentResultsCount: searchState.results.length
            });

            if (!data.results) {
                throw new Error('لم يتم العثور على نتائج');
            }

            // Filter out any results we've already seen
            const newResults = data.results.filter((r: Detainee) => !searchState.seenIds.has(r.id));

            console.log('Filtered results:', {
                beforeFilter: data.results.length,
                afterFilter: newResults.length
            });

            setSearchState(prev => ({
                results: [...prev.results, ...newResults],
                totalCount: data.totalCount || prev.totalCount,
                currentPage: data.currentPage || prev.currentPage + 1,
                totalPages: data.totalPages || prev.totalPages,
                hasNextPage: data.hasNextPage || false,
                hasPreviousPage: data.hasPreviousPage || true,
                pageSize: data.pageSize || prev.pageSize,
                seenIds: new Set([...prev.seenIds, ...newResults.map((r: Detainee) => r.id)])
            }));
        } catch (error) {
            console.error('Load more error:', error);
        } finally {
            setLoading(false);
        }
    }, [searchState, currentQuery]);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6" dir="rtl">
            <SearchBox onSearchAction={handleSearch} loading={loading} />

            {/* Show message when no results found */}
            {!loading && searchState.results.length === 0 && currentQuery && (
                <div className="text-center p-4">
                    <p className="text-lg text-muted-foreground">
                        لم يتم العثور على نتائج للبحث عن "{currentQuery}"
                    </p>
                </div>
            )}

            {/* Always show total count when we have a query and totalCount is available */}
            {!loading && currentQuery && searchState.totalCount !== null && (
                <p className="text-muted-foreground text-sm">
                    تم العثور على {searchState.totalCount} نتيجة
                </p>
            )}

            {searchState.results.length > 0 && (
                <div className="space-y-4">
                    {searchState.results.map((result) => (
                        <Card key={result.id} className="overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-4">
                                    {/* Header with name and status */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <User2 className="w-5 h-5 text-muted-foreground" />
                                            <span className="font-bold text-lg">{result.full_name}</span>
                                        </div>
                                        <Badge 
                                            variant={getStatusVariant(result.status)} 
                                            className="mr-auto text-base px-3 py-1 font-semibold"
                                        >
                                            {getStatusDisplay(result.status)}
                                        </Badge>
                                    </div>

                                    {/* Main information grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Personal Information */}
                                        <div className="space-y-3">
                                            {result.age_at_detention && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span>العمر عند الاعتقال: {result.age_at_detention} سنة</span>
                                                </div>
                                            )}
                                            {result.gender && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User2 className="w-4 h-4 text-muted-foreground" />
                                                    <span>الجنس: {
                                                        result.gender === 'male' ? 'ذكر' : 
                                                        result.gender === 'female' ? 'أنثى' : 
                                                        result.gender === 'unknown' || !result.gender ? 'غير محدد' : 
                                                        'غير محدد'
                                                    }</span>
                                                </div>
                                            )}
                                            {result.physical_description && (
                                                <div className="flex items-start gap-2 text-sm">
                                                    <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                                                    <span>الوصف الجسدي: {result.physical_description}</span>
                                                </div>
                                            )}
                                            {result.date_of_detention && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span>تاريخ الاعتقال: {format(new Date(result.date_of_detention), 'dd MMMM yyyy', { locale: ar })}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Location and Detention Information */}
                                        <div className="space-y-3">
                                            {result.last_seen_location && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                                    <span>آخر مكان شوهد فيه: {result.last_seen_location}</span>
                                                </div>
                                            )}
                                            {result.detention_facility && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                                    <span>مركز الاحتجاز: {result.detention_facility}</span>
                                                </div>
                                            )}
                                            {result.last_update_date && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span>آخر تحديث: {format(new Date(result.last_update_date), 'dd MMMM yyyy', { locale: ar })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contact and Additional Information */}
                                    <div className="border-t pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                {result.contact_info && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                                        <span>معلومات الاتصال: {result.contact_info}</span>
                                                    </div>
                                                )}
                                                {result.source_organization && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                                        <span>المصدر: {result.source_organization}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                {result.additional_notes && (
                                                    <div className="flex items-start gap-2 text-sm">
                                                        <Info className="w-4 h-4 text-muted-foreground mt-1" />
                                                        <span>ملاحظات إضافية: {result.additional_notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

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
