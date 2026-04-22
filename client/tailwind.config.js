/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          cream: '#F5ECD7',
          kraft: '#C8A96E',
          watercolor: '#E8D5B0',
          'card-dark': '#3D2B1F',
        },
        chapter: {
          1: '#E8A598', // warm coral
          2: '#98B8E8', // sky blue
          3: '#A8D5A2', // leaf green
          4: '#E8CE98', // warm amber
          5: '#C4A8D5', // soft lavender
          6: '#E8B8A8', // dusty rose
        },
        palette: {
          red:    '#D94F3D',
          blue:   '#3D7BC4',
          green:  '#4A9E6B',
          orange: '#E8873A',
          lavender: '#9B72C4',
          yellow: '#D4AC35',
          pink:   '#E87CA0',
          mint:   '#4ABCAA',
        },
      },
      fontFamily: {
        handwriting: ['Caveat', 'cursive'],
        body: ['Patrick Hand', 'cursive'],
      },
      animation: {
        'bob': 'bob 2.8s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'blink': 'blink 4s ease-in-out infinite',
        'squash': 'squash 0.3s ease-in-out',
        'spin-slow': 'spin 6s linear infinite',
        'peel-on': 'peelOn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-down': 'slideDown 0.3s ease-in',
        'fade-in': 'fadeIn 0.3s ease-in',
        'star-pop': 'starPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'typewriter': 'typewriter 0.05s steps(1) forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
      },
      keyframes: {
        bob: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(2deg)' },
          '66%': { transform: 'translateY(-4px) rotate(-1deg)' },
        },
        blink: {
          '0%, 90%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.05)' },
        },
        squash: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.2, 0.8)' },
          '60%': { transform: 'scale(0.9, 1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        peelOn: {
          '0%': { transform: 'scale(0.8) rotate(-3deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        starPop: {
          '0%': { transform: 'scale(0) rotate(-20deg)', opacity: '0' },
          '60%': { transform: 'scale(1.3) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
      },
      boxShadow: {
        'paper': '2px 3px 8px rgba(61,43,31,0.18), 0 1px 2px rgba(61,43,31,0.12)',
        'paper-lg': '4px 6px 16px rgba(61,43,31,0.22), 0 2px 4px rgba(61,43,31,0.14)',
        'inset-paper': 'inset 0 2px 4px rgba(61,43,31,0.12)',
        'washi': '2px 2px 0px rgba(61,43,31,0.25)',
      },
    },
  },
  plugins: [],
}
