import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-prompt)', 'sans-serif'],
        prompt: ['Prompt', 'sans-serif'],
      },
      colors: {
        'dark-button': '#212121',
        'otp-verify': '#C4AA75',
      },
    },
  },
  plugins: [],
};

export default config;