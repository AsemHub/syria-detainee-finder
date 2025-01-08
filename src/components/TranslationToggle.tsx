"use client";

import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function TranslationToggle() {
  const handleTranslate = (service: 'google' | 'deepl') => {
    const currentUrl = window.location.href;
    const browserLang = navigator.language.split('-')[0];
    
    if (service === 'google') {
      window.open(
        `https://translate.google.com/translate?sl=ar&tl=${browserLang}&u=${encodeURIComponent(currentUrl)}`,
        '_blank'
      );
    } else {
      // DeepL website with page title pre-filled
      const pageTitle = document.title;
      window.open(
        `https://www.deepl.com/translator#ar/${browserLang}/${encodeURIComponent(pageTitle)}`,
        '_blank'
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-foreground hover:text-primary hover:bg-primary/10"
        >
          <Languages className="h-5 w-5" />
          <span className="sr-only">Translation options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={() => handleTranslate('google')} className="cursor-pointer">
          Google Translate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleTranslate('deepl')} className="cursor-pointer">
          DeepL (Higher quality)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
