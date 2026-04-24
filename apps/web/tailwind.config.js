/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#06060E',
          800: '#0C0C1A',
          700: '#141426',
          600: '#1C1C34',
          500: '#252542',
        },
        accent: {
          red: '#E53E3E',
          'red-bright': '#FC5C65',
          gold: '#F6AD55',
          'gold-bright': '#FCD34D',
          jade: '#38B2AC',
          'jade-bright': '#4FD1C5',
        },
        chip: {
          10: '#4FD1C5',
          50: '#63B3ED',
          100: '#F6AD55',
          500: '#FC5C65',
        },
      },
      fontFamily: {
        display: ['"Bungee Shade"', 'cursive'],
        heading: ['"Syne"', 'sans-serif'],
        body: ['"Lexend"', 'sans-serif'],
      },
      animation: {
        'dice-shake': 'diceShake 0.5s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        diceShake: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(-15deg) scale(1.1)' },
          '75%': { transform: 'rotate(15deg) scale(1.1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(246,173,85,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(246,173,85,0.6)' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        bounceIn: {
          from: { transform: 'scale(0.3)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
