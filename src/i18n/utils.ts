import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import type { Translations } from './en';

export const translations: Record<string, Translations> = { en, es, fr };

export type Lang = 'en' | 'es' | 'fr';

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang === 'es' || lang === 'fr') return lang;
  return 'en';
}

export function useTranslations(lang: Lang) {
  return translations[lang] ?? translations.en;
}

export const alternates: Record<Lang, string> = {
  en: '/',
  es: '/es/',
  fr: '/fr/',
};
