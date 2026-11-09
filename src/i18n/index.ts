import { useLocales } from 'expo-localization';
import { useCallback } from 'react';
import { useSettings } from '@/stores/settings';
import { am } from './am';
import { en, type Dictionary } from './en';

/**
 * A small typed translation layer. Adding a language (Afaan Oromo, Tigrinya,
 * Somali, Swahili…) = one dictionary file typed as `Dictionary` plus an entry
 * in LANGUAGES; the compiler then lists every missing key.
 */
export const LANGUAGES = {
  en: { label: 'English', dict: en },
  am: { label: 'አማርኛ', dict: am },
} as const satisfies Record<string, { label: string; dict: Dictionary }>;

export type Language = keyof typeof LANGUAGES;
export type LanguagePref = Language | 'system';

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Leaves<Dictionary>;
export type TParams = Record<string, string | number>;

export function isLanguage(code: string | null | undefined): code is Language {
  return !!code && Object.prototype.hasOwnProperty.call(LANGUAGES, code);
}

/** The user's choice wins; otherwise the first phone language we support; otherwise English. */
export function resolveLanguage(pref: LanguagePref, deviceCodes: readonly (string | null | undefined)[]): Language {
  if (pref !== 'system') return pref;
  return deviceCodes.find(isLanguage) ?? 'en';
}

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function translate(lang: Language, key: TKey, params?: TParams): string {
  const text = lookup(LANGUAGES[lang].dict, key) ?? lookup(en, key) ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** The active language: settings choice, else the phone's languages. */
export function useLanguage(): Language {
  const pref = useSettings((s) => s.language);
  const locales = useLocales();
  return resolveLanguage(pref, locales.map((l) => l.languageCode));
}

export function useT() {
  const lang = useLanguage();
  return useCallback((key: TKey, params?: TParams) => translate(lang, key, params), [lang]);
}
