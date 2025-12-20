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
        sans: ['Prompt', 'sans-serif'], // Set Prompt as the default sans font
        prompt: ['Prompt', 'sans-serif'],
      },
      colors: {
        'dark-button': '#212121',
      },
    },
  },
  plugins: [],
};

export default config;