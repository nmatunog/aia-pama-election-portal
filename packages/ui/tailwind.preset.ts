import type { Config } from 'tailwindcss';
import { BRAND } from '@aia-pama/shared';

/** AIA brand Tailwind preset — Digital Red ≤ 20% of layout */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        aia: {
          red: BRAND.red,
          'red-hover': BRAND.redHover,
          'red-subtle': BRAND.redSubtle,
          orange: BRAND.orange,
          blue: BRAND.blue,
        },
        surface: {
          page: BRAND.surfacePage,
          card: BRAND.surfaceCard,
        },
        ink: {
          primary: BRAND.inkPrimary,
          secondary: BRAND.inkSecondary,
        },
        border: {
          DEFAULT: BRAND.border,
        },
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'Inter',
          'Source Sans 3',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        body: ['18px', { lineHeight: '1.6' }],
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
};

export default preset;
