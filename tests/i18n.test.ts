import { am } from '@/i18n/am';
import { en } from '@/i18n/en';
import { LANGUAGES, resolveLanguage, translate } from '@/i18n';

function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : keys(v as object, `${prefix}${k}.`)));
}
function placeholders(s: string) {
  return (s.match(/\{\w+\}/g) ?? []).sort();
}
function leaf(o: object, key: string): string {
  return key.split('.').reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], o) as string;
}

describe('i18n dictionaries', () => {
  it.each(Object.keys(LANGUAGES))('%s has exactly the English keys and no empty strings', (code) => {
    const dict = LANGUAGES[code as keyof typeof LANGUAGES].dict;
    expect(keys(dict).sort()).toEqual(keys(en).sort());
    for (const k of keys(dict)) expect(leaf(dict, k).trim()).not.toBe('');
  });

  it('keeps the same {placeholders} in every translation', () => {
    for (const k of keys(en)) expect(placeholders(leaf(am, k))).toEqual(placeholders(leaf(en, k)));
  });

  it('writes Amharic in Ethiopic script', () => {
    expect(am.tabs.home).toMatch(/[ሀ-፿]/);
  });
});

describe('resolveLanguage', () => {
  it('follows an explicit choice', () => {
    expect(resolveLanguage('am', ['en'])).toBe('am');
    expect(resolveLanguage('en', ['am'])).toBe('en');
  });
  it('uses the first supported phone language', () => {
    expect(resolveLanguage('system', ['fr', 'am', 'en'])).toBe('am');
    expect(resolveLanguage('system', [null, 'en'])).toBe('en');
  });
  it('falls back to English', () => {
    expect(resolveLanguage('system', ['fr', 'om'])).toBe('en');
    expect(resolveLanguage('system', [])).toBe('en');
  });
});

describe('translate', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'settings.minutes', { n: 15 })).toBe('15 min');
    expect(translate('am', 'settings.minutes', { n: 15 })).toBe('15 ደቂቃ');
  });
  it('leaves unknown placeholders visible rather than blank', () => {
    expect(translate('en', 'join.joined')).toBe("You're in: {title}");
  });
});
