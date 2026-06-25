// Per-language dynamic loaders. Each language JSON is split into its own
// async chunk so neither dictionary is bundled into the entry chunk.
// NOTE: `import('./x.json')` resolves to `{ default: {...} }` — read `.default`.
export const localeLoaders = {
  en: () => import('./en.json'),
  hi: () => import('./hi.json')
};

export type SupportedLanguage = keyof typeof localeLoaders;
