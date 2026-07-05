/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FAF8F5',
          50: '#FFFFFF',
          100: '#FAF8F5',
          200: '#F3EEE6',
        },
        sand: {
          DEFAULT: '#D8CDBD',
          50: '#EFE9DF',
          100: '#D8CDBD',
          200: '#BFAF96',
        },
        ink: {
          DEFAULT: '#161412',
          50: '#3A3631',
          100: '#161412',
        },
        gold: {
          DEFAULT: '#A88A5C',
          50: '#C7AD83',
          100: '#A88A5C',
          200: '#856B43',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      borderRadius: {
        'shell': '28px',
        'card': '24px',
        'button': '12px',
        'chip': '9999px',
      },
      boxShadow: {
        'shell': '0 24px 80px -42px rgba(22,20,18,0.45)',
        'card': '0 20px 60px -30px rgba(22,20,18,0.35)',
        'dropdown': '0 10px 40px -10px rgba(22,20,18,0.3)',
        'sm':     '0 1px 3px 0 rgba(22,20,18,0.08), 0 1px 2px -1px rgba(22,20,18,0.06)',
        'md':     '0 4px 12px -2px rgba(22,20,18,0.10), 0 2px 4px -2px rgba(22,20,18,0.06)',
        'lg':     '0 12px 32px -8px rgba(22,20,18,0.15), 0 4px 8px -4px rgba(22,20,18,0.08)',
        'xl':     '0 24px 64px -20px rgba(22,20,18,0.25), 0 8px 16px -8px rgba(22,20,18,0.12)',
        'glow':   '0 0 0 3px rgba(168,138,92,0.25)',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        accent: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(3rem, 8vw, 7rem)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.25rem, 5vw, 4rem)', { lineHeight: '1.02', letterSpacing: '-0.01em' }],
        'display-md': ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
      },
      maxWidth: {
        'content': '1400px',
      },
      letterSpacing: {
        'widest-2': '0.25em',
      },
      transitionTimingFunction: {
        'editorial': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'rise': 'rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'float': 'float 4s ease-in-out infinite',
        'float-reverse': 'float 4s ease-in-out infinite reverse',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-slow-reverse': 'float 6s ease-in-out infinite reverse',
        'scale-in': 'scale-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'skeleton-pulse': 'skeleton-pulse 1.8s ease-in-out infinite',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
    },
  },
  plugins: [],
};
