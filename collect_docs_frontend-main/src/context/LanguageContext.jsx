// src/context/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../i18n/en.json';
import ar from '../i18n/ar.json';

const LanguageContext = createContext(null);
const dictionaries = { en, ar };

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  // Load saved language preference on mount
  useEffect(() => {
    const stored = localStorage.getItem('lang');
    if (stored === 'en' || stored === 'ar') {
      setLang(stored);
    }
  }, []);

  // Apply direction & language attributes whenever lang changes
  useEffect(() => {
    localStorage.setItem('lang', lang);

    // This is the most important line for RTL support
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // Also good for accessibility & SEO
    document.documentElement.lang = lang;

    // Optional: you can also toggle a class if you prefer CSS-based styling
    // document.documentElement.classList.toggle('rtl', lang === 'ar');
  }, [lang]);

  // Translation function with fallback to English
  const t = (key, defaultValue = null) => {
    const keys = key.split('.');
    let value = dictionaries[lang];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    // Fallback to English if translation is missing
    if (value === undefined) {
      value = dictionaries.en;
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
    }

    return value ?? defaultValue ?? key;
  };

  // Helper — most components will use this to make RTL-aware decisions
  const isRtl = () => lang === 'ar';

  const changeLanguage = (newLang) => {
    if (newLang === 'en' || newLang === 'ar') {
      setLang(newLang);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t,
        changeLanguage,
        isRtl,           // ← newly added – very useful in components
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}