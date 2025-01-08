"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { ButtonProps } from '@/components/ui/button';

type TranslationService = 'google' | 'deepl';

export function TranslationBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [browserLanguage, setBrowserLanguage] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    // Get the browser's language
    const language = navigator.language || (navigator as any).userLanguage;
    setBrowserLanguage(language);

    // Check if the language is not Arabic
    if (!language.toLowerCase().startsWith('ar')) {
      // Check if the user has previously dismissed the banner
      const hasUserDismissed = localStorage.getItem('translationBannerDismissed');
      if (!hasUserDismissed) {
        setIsVisible(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('translationBannerDismissed', 'true');
  };

  const handleTranslate = (service: TranslationService, newTab: boolean = false) => {
    const targetLang = browserLanguage.split('-')[0];
    let translateUrl = '';

    if (service === 'google') {
      translateUrl = `https://translate.google.com/translate?sl=ar&tl=${targetLang}&u=${encodeURIComponent(window.location.href)}`;
    } else {
      // DeepL website - we'll send them to the translator with some text pre-filled
      const pageTitle = document.title;
      translateUrl = `https://www.deepl.com/translator#ar/${targetLang}/${encodeURIComponent(pageTitle)}`;
    }
    
    if (newTab) {
      window.open(translateUrl, '_blank');
    } else {
      window.location.href = translateUrl;
    }
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background border border-border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm mb-3" dir="ltr">
            This page is in Arabic. Would you like to translate it to your preferred language?
          </p>
          {!showOptions ? (
            <div className="flex gap-2">
              <Button 
                onClick={() => handleTranslate('google', false)}
                className="flex items-center gap-2"
              >
                Translate with Google
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowOptions(true)}
              >
                More Options
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2" dir="ltr">
                Choose your preferred translation service:
              </p>
              <div className="grid gap-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium" dir="ltr">Google Translate:</p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleTranslate('google', false)}
                      className="flex items-center gap-2"
                    >
                      Translate in this window
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleTranslate('google', true)}
                      className="flex items-center gap-2"
                    >
                      New tab
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-medium" dir="ltr">DeepL (Higher quality):</p>
                  <Button 
                    variant="outline"
                    onClick={() => handleTranslate('deepl', true)}
                    className="flex items-center gap-2"
                  >
                    Open in DeepL
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>

                <Button 
                  variant="ghost"
                  onClick={handleDismiss}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss translation banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
