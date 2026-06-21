/** @type {import('tailwindcss').Config} */

/* ==========================================================================
   Sitewise Design System — Tailwind token map
   Construction expense management. Fintech-precise, dark + amber.
   Brand: Ink #0A0E0D · Amber #FFB800 · Forest #22C55E · Cream #FAFAF7 ·
          Stone #A8A29E · Clay #E8743C
   ========================================================================== */

// THE accent — amber. Also remapped onto blue/indigo so legacy hardcoded
// `bg-blue-600`/`text-indigo-500` usages cascade to the brand accent.
const amber = {
  DEFAULT: '#FFB800',
  50: '#FFFBEB',
  100: '#FFF4D1', // amber-soft
  200: '#FEE8A6',
  300: '#FFD968',
  400: '#FFC838',
  500: '#FFB800', // amber — THE accent
  600: '#E69F00', // amber-deep (hover)
  700: '#B87E00',
  800: '#8A5F00',
  900: '#6B4900',
  950: '#4A3200',
};

// Warm neutral ramp — cream → stone → ink. Remapped onto gray/slate/neutral/zinc
// so the whole UI reads warm instead of cold blue-gray.
const warm = {
  DEFAULT: '#A8A29E', // stone
  50: '#FAFAF7',  // cream
  100: '#F4F1EC', // cream-2
  200: '#E5E5E0', // border-light
  300: '#D6D3CD',
  400: '#A8A29E', // stone
  500: '#78716C', // stone-2
  600: '#57534E', // stone-3
  700: '#3F3B38',
  800: '#2A3231', // ink-4 (dark borders)
  900: '#13191A', // ink-2
  950: '#0A0E0D', // ink
};

const forest = {
  DEFAULT: '#22C55E',
  50: '#F0FDF4',
  100: '#DCFCE7', // forest-soft
  200: '#BBF7D0',
  300: '#86EFAC',
  400: '#4ADE80',
  500: '#22C55E', // forest
  600: '#16A34A',
  700: '#15803D', // forest-deep
  800: '#166534',
  900: '#14532D',
};

const clay = {
  DEFAULT: '#E8743C',
  50: '#FFF7F3',
  100: '#FFE4D6', // clay-soft
  200: '#FFCBB0',
  300: '#FBA882',
  400: '#F08A55',
  500: '#E8743C', // clay
  600: '#D2551F',
  700: '#C2410C', // clay-deep
  800: '#9A3412',
  900: '#7C2D12',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Safe area insets for notched devices
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      margin: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      height: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      minHeight: {
        'touch': '44px',
      },
      colors: {
        // --- Brand named palettes ---------------------------------------
        ink: {
          DEFAULT: '#0A0E0D',
          2: '#13191A',
          3: '#1F2625',
          4: '#2A3231',
        },
        cream: {
          DEFAULT: '#FAFAF7',
          2: '#F4F1EC',
          3: '#EDE9E1',
        },
        amber,
        forest,
        clay,
        stone: warm, // override Tailwind's stone with the brand warm ramp

        // --- Semantic roles (drive .btn/.card/.input/.status-*) ---------
        primary: amber,    // THE accent — CTAs, focus, key numbers
        secondary: warm,   // ink/stone — secondary "ink" buttons
        success: forest,
        warning: amber,
        error: clay,
        danger: clay,
        accent: amber,

        // --- Legacy hardcoded usages cascade to brand ------------------
        blue: amber,
        indigo: amber,
        sky: amber,
        gray: warm,
        slate: warm,
        neutral: warm,
        zinc: warm,
        orange: clay,
        red: clay,
        rose: clay,
        green: forest,
        emerald: forest,
        yellow: amber,
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        eyebrow: '0.08em',
      },
      borderRadius: {
        // Brand caps radii at 16px. Buttons/inputs/badges = 6px, cards = 12px.
        DEFAULT: '6px',
        sm: '6px',
        md: '6px',
        lg: '12px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgb(10 14 13 / 0.04), 0 4px 12px rgb(10 14 13 / 0.04)',
        'card-hover': '0 2px 4px rgb(10 14 13 / 0.05), 0 8px 24px rgb(10 14 13 / 0.08)',
        modal: '0 24px 48px -12px rgb(10 14 13 / 0.18)',
        'inset-hi': 'inset 0 1px 0 rgb(255 255 255 / 0.04)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.32, 0.72, 0, 1)',
        cross: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backgroundImage: {
        dotgrid: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
      },
      backgroundSize: {
        dotgrid: '24px 24px',
      },
    },
  },
  plugins: [],
}
