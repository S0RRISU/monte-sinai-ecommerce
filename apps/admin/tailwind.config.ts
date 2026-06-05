import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        panel: '#0b1728',
        card: 'rgba(15, 31, 52, 0.82)',
        line: 'rgba(148, 163, 184, 0.22)',
        gold: '#f6b900',
        electric: '#1266ff',
        cyan: '#19e6d0'
      },
      borderRadius: {
        squircle: '22px'
      },
      boxShadow: {
        glow: '0 24px 80px rgba(18, 102, 255, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
