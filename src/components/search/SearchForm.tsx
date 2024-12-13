import React from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface SearchFormProps {
  onSearch?: (query: string) => void;
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const { register, handleSubmit } = useForm<{ query: string }>();
  const router = useRouter();

  const onSubmit = (data: { query: string }) => {
    if (onSearch) {
      onSearch(data.query);
    } else {
      router.push(`/search?q=${encodeURIComponent(data.query)}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      role="search"
      className="flex w-full max-w-sm items-center space-x-2"
    >
      <Input
        type="search"
        placeholder="Search..."
        {...register('query')}
        aria-label="Search query"
        className="flex-1"
      />
      <Button
        type="submit"
        aria-label="Search"
      >
        Search
      </Button>
    </form>
  );
}
