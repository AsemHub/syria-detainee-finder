"use client"

import { useState, useCallback } from 'react';
import { SearchBox } from './SearchBox';
import { SearchFilters, type SearchFilters as SearchFiltersType } from './SearchFilters';
import type { Database, DetaineeGender } from '@/lib/database.types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, MapPin, Building2, User, User2, FileText, Phone, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from './ui/button';
import { useToast } from "@/hooks/use-toast";
import Logger from "@/lib/logger";

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
    'مطلق سراح': 'released',
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
    switch (normalizeStatus(status)) {
        case 'in_custody':
            return 'warning';
        case 'missing':
            return 'destructive';
        case 'released':
            return 'success';
        case 'deceased':
            return 'deceased';
        case 'unknown':
        default:
            return 'default';
    }
}

function getStatusDisplay(status: string | null): string {
    switch (normalizeStatus(status)) {
        case 'in_custody':
            return 'معتقل';
        case 'missing':
            return 'مفقود';
        case 'released':
            return 'مطلق سراح';
        case 'deceased':
            return 'متوفى';
        case 'unknown':
        default:
            return 'غير معروف';
    }
}

export function SearchContainer() {
    const { toast } = useToast();
    const [searchState, setSearchState] = useState<SearchState>({
        results: [],
        totalCount: null,
        currentPage: 1,
        totalPages: null,
        hasNextPage: false,
        hasPreviousPage: false,
        pageSize: 20,
        seenIds: new Set(),
    });

    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<SearchFiltersType>({});

    const handleSearch = useCallback(async (query: string, page: number = 1, currentFilters: SearchFiltersType = {}) => {
        if (!query.trim()) {
            setSearchState({
                results: [],
                totalCount: null,
                currentPage: 1,
                totalPages: null,
                hasNextPage: false,
                hasPreviousPage: false,
                pageSize: 20,
                seenIds: new Set(),
            });
            return;
        }

        setIsLoading(true);
        toast({
            title: "جاري البحث...",
            description: "يتم البحث عن المعتقلين المطابقين لمعايير البحث",
            duration: 2000,
        });

        try {
            const searchParams = {
                query,
                pageSize: 20,
                pageNumber: page,
                estimateTotal: true,
                ...(currentFilters.status && { detentionStatus: currentFilters.status }),
                ...(currentFilters.gender && { gender: currentFilters.gender }),
                ...(currentFilters.ageMin !== undefined && { ageMin: currentFilters.ageMin }),
                ...(currentFilters.ageMax !== undefined && { ageMax: currentFilters.ageMax }),
                ...(currentFilters.location && { location: currentFilters.location }),
                ...(currentFilters.detentionFacility && { facility: currentFilters.detentionFacility }),
                ...(currentFilters.dateFrom && { dateFrom: currentFilters.dateFrom }),
                ...(currentFilters.dateTo && { dateTo: currentFilters.dateTo })
            };

            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchParams),
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            
            setSearchState(prevState => ({
                results: page === 1 ? data.results : [...prevState.results, ...data.results],
                totalCount: data.totalCount,
                currentPage: data.currentPage,
                totalPages: data.totalPages,
                hasNextPage: data.hasNextPage,
                hasPreviousPage: data.hasPreviousPage,
                pageSize: data.pageSize,
                seenIds: new Set([...prevState.seenIds, ...data.results.map((r: Detainee) => r.id)]),
            }));

            if (data.results.length === 0) {
                toast({
                    title: "لم يتم العثور على نتائج",
                    description: "لم يتم العثور على نتائج مطابقة لمعايير البحث",
                    duration: 3000,
                });
            } else {
                toast({
                    title: "تم العثور على نتائج",
                    description: `تم العثور على ${data.totalCount} نتيجة`,
                    duration: 3000,
                });
            }
        } catch (error) {
            console.error('Search error:', error);
            toast({
                title: "خطأ في البحث",
                description: "حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleFiltersChange = useCallback((newFilters: SearchFiltersType) => {
        setFilters(newFilters);
        // Reset search state before performing new search with filters
        setSearchState({
            results: [],
            totalCount: null,
            currentPage: 1,
            totalPages: null,
            hasNextPage: false,
            hasPreviousPage: false,
            pageSize: 20,
            seenIds: new Set(),
        });
        // Only perform search if there's an active query
        if (searchQuery.trim()) {
            handleSearch(searchQuery, 1, newFilters);
        }
    }, [searchQuery, handleSearch]);

    const loadMore = useCallback(async () => {
        if (!searchState.hasNextPage || !searchQuery) {
            Logger.debug('LoadMore early return:', {
                hasNextPage: searchState.hasNextPage,
                hasCurrentQuery: !!searchQuery,
                currentPage: searchState.currentPage
            });
            return;
        }

        setIsLoading(true);
        toast({
            title: "جاري تحميل المزيد...",
            description: "يتم تحميل المزيد من النتائج",
            duration: 2000,
        });

        try {
            await handleSearch(searchQuery, searchState.currentPage + 1);
        } catch (error) {
            console.error('Load more error:', error);
            toast({
                title: "خطأ في التحميل",
                description: "حدث خطأ أثناء تحميل المزيد من النتائج",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    }, [searchState, searchQuery]);

    return (
        <div className="space-y-4">
            <div className="w-full">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <SearchBox
                            onSearch={(query) => {
                                setSearchQuery(query);
                                handleSearch(query, 1, filters);
                            }}
                            isLoading={isLoading}
                        />
                    </div>
                    <SearchFilters filters={filters} onFiltersChange={handleFiltersChange} />
                </div>
            </div>

            {/* Show message when no results found */}
            {!isLoading && searchState.results.length === 0 && searchQuery && (
                <div className="text-center p-4">
                    <p className="text-lg text-muted-foreground">
                        لم يتم العثور على نتائج للبحث عن "{searchQuery}"
                    </p>
                </div>
            )}

            {/* Always show total count when we have a query and totalCount is available */}
            {!isLoading && searchQuery && searchState.totalCount !== null && (
                <p className="text-muted-foreground text-sm">
                    تم العثور على {searchState.totalCount} نتيجة
                </p>
            )}

            {searchState.results.length > 0 && (
                <div className="space-y-4">
                    {searchState.results.map((result) => (
                        <Card key={result.id} className="overflow-hidden bg-card/50 hover:bg-card/80 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-4">
                                    {/* Header with name and status */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <User2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                            <h3 className="font-bold text-lg">{result.full_name}</h3>
                                        </div>
                                        <Badge 
                                            variant={getStatusVariant(result.status)} 
                                            className="text-base px-4 py-1.5 font-semibold shrink-0"
                                        >
                                            {getStatusDisplay(result.status)}
                                        </Badge>
                                    </div>

                                    {/* Personal Information */}
                                    <div className="space-y-3">
                                        {result.age_at_detention && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>العمر عند الاعتقال: {result.age_at_detention} سنة</span>
                                            </div>
                                        )}
                                        {result.gender && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <User2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>الجنس: {result.gender}</span>
                                            </div>
                                        )}
                                        {result.physical_description && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>الوصف الجسدي: {result.physical_description}</span>
                                            </div>
                                        )}
                                        {result.date_of_detention && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>تاريخ الاعتقال: {format(new Date(result.date_of_detention), 'dd MMMM yyyy', { locale: ar })}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Location Information */}
                                    <div className="space-y-3">
                                        {result.last_seen_location && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>آخر مكان شوهد فيه: {result.last_seen_location}</span>
                                            </div>
                                        )}
                                        {result.detention_facility && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>مركز الاحتجاز: {result.detention_facility}</span>
                                            </div>
                                        )}
                                        {result.last_update_date && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>آخر تحديث: {format(new Date(result.last_update_date), 'dd MMMM yyyy', { locale: ar })}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contact and Additional Information */}
                                    <div className="space-y-3 border-t pt-3">
                                        {result.contact_info && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>معلومات الاتصال: {result.contact_info}</span>
                                            </div>
                                        )}
                                        {result.source_organization && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>المصدر: {result.source_organization}</span>
                                            </div>
                                        )}
                                        {result.additional_notes && (
                                            <div className="flex gap-3 text-sm items-center">
                                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <span>ملاحظات إضافية: {result.additional_notes}</span>
                                            </div>
                                        )}
                                        {result.record_validation && (
                                            <div className="flex gap-3 text-sm items-center">
                                                {result.record_validation === 'verified' ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                                )}
                                                <span>حالة التحقق: {
                                                    result.record_validation === 'verified' ? 'تم التحقق' :
                                                    result.record_validation === 'pending' ? 'قيد المراجعة' :
                                                    'لم يتم التحقق'
                                                }</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {searchState.hasNextPage && (
                <div className="flex justify-center mt-6">
                    <Button
                        onClick={loadMore}
                        disabled={isLoading}
                        className="min-w-[200px]"
                    >
                        {isLoading ? 'جاري التحميل...' : 'تحميل المزيد'}
                    </Button>
                </div>
            )}
        </div>
    );
}
