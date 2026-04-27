/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      colors: {
        // Light mode colors (using Tailwind's slate palette)
        // Primary background: white
        // Secondary background: slate-50
        // Tertiary background: slate-100
        // Primary text: slate-800
        // Secondary text: slate-500
        // Border: slate-200
        // Accent: blue-500
      },
      spacing: {
        'toolbar': '40px',
        'statusbar': '24px',
        'sidebar': '240px',
        'outline': '200px',
      },
      fontSize: {
        'content-xs': ['0.75rem', { lineHeight: '1rem' }],
        'content-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'content-base': ['1rem', { lineHeight: '1.75rem' }],
        'content-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'content-xl': ['1.25rem', { lineHeight: '1.75rem' }],
        'content-2xl': ['1.5rem', { lineHeight: '2rem' }],
        'content-3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        'content-4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      maxWidth: {
        'content': '820px',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
      },
    },
  },
  plugins: [],
}
