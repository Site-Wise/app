import en from './en.json';
import hi from './hi.json';

export const translations = {
  en,
  hi
};

export type SupportedLanguage = keyof typeof translations;