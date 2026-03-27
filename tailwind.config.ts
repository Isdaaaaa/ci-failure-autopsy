import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        backdrop: '#0F172A',
        slate: '#E2E8F0',
        cyan: '#06B6D4',
        amber: '#F59E0B'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        panel: '0 8px 24px rgba(15, 23, 42, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
