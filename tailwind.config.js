/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070A10',
          900: '#0F172A',
          850: '#152035',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        noc: {
          router: '#3B82F6',
          cpu: '#10B981',
          cache: '#06B6D4',
          dram: '#8B5CF6',
          template: '#F59E0B',
          link: '#64748B',
        }
      }
    },
  },
  plugins: [],
}
