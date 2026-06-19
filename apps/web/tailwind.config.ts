import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        monte: {
          blue: '#003b91',
          royal: '#0057d9',
          gold: '#ffd21f',
          ink: '#10203a',
          soft: '#f4f7fb'
        }
      },
      boxShadow: {
        card: '0 18px 50px rgba(16, 32, 58, 0.10)'
      }
    }
  },
  plugins: []
};

export default config;
