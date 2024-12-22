"use client"

import { useState, useCallback } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Search, Loader2 } from "lucide-react"

interface SearchBoxProps {
    onSearchAction: (searchText: string) => Promise<void>;
    loading?: boolean;
}

export function SearchBox({ onSearchAction, loading = false }: SearchBoxProps) {
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
            await onSearchAction(query.trim());
        } catch (error) {
            setError(error instanceof Error ? error.message : 'حدث خطأ غير متوقع');
        }
    }, [query, onSearchAction]);

    return (
        <form onSubmit={handleSubmit} className="w-full space-y-4" dir="rtl">
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="ابحث بالاسم أو الموقع..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 text-right"
                    disabled={loading}
                />
                <Button type="submit" disabled={loading} variant="default">
                    {loading ? (
                        <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            جاري البحث...
                        </>
                    ) : (
                        <>
                            <Search className="ml-2 h-4 w-4" />
                            بحث
                        </>
                    )}
                </Button>
            </div>
            {error && (
                <div className="text-red-500 text-sm text-right">
                    {error}
                </div>
            )}
        </form>
    );
}
