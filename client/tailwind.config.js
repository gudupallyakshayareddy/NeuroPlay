const c = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: c('void'),
        navy: c('navy'),
        panel: c('panel'),
        ink: c('ink'),
        dim: c('dim'),
        violet: { DEFAULT: c('violet'), soft: c('violet-soft') },
        cyan: { DEFAULT: c('cyan') },
        success: c('success'),
        warn: c('warn'),
        danger: c('danger'),
      },
      fontFamily: {
        display: ['"Space Grotesk Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgb(124 92 255 / 0.55)',
        'glow-lg': '0 0 36px -2px rgb(124 92 255 / 0.7)',
        'glow-cyan': '0 0 28px -4px rgb(34 211 238 / 0.5)',
      },
    },
  },
  plugins: [],
}
