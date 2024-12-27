"use client"

import { useState, useCallback } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Loader2 } from "lucide-react"
import { SearchLovedOnesIcon } from "./ui/icons"

interface SearchBoxProps {
    onSearch: (searchText: string) => void;
    isLoading?: boolean;
}

export function SearchBox({ onSearch, isLoading = false }: SearchBoxProps) {
    const [query, setQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        setError(null);

        if (!query.trim()) {
            setError("الرجاء إدخال نص للبحث");
            return;
        }

        try {
            onSearch(query.trim());
        } catch (error) {
            setError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
        }
    }, [query, onSearch]);

    return (
        <form onSubmit={handleSubmit} className="w-full space-y-4" dir="rtl">
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="ابحث بالاسم أو الموقع..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 text-right"
                    disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading} variant="default" size="lg" className="px-8">
                    {isLoading ? (
                        <>
                            <Loader2 className="ml-2 h-7 w-7 animate-spin" />
                            جاري البحث...
                        </>
                    ) : (
                        <>
                            <SearchLovedOnesIcon className="ml-2 h-7 w-7 text-white" />
                            بحث
                        </>
                    )}
                </Button>
            </div>
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
        </form>
    )
}
