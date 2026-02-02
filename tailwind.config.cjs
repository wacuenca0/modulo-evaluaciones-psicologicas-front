/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts,scss}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        institucional: '#1E3A8A',
        medico: '#059669',
        blanco: '#FFFFFF',
        'gris-claro': '#F8FAFC',
        'gris-medio': '#64748B',
        'rojo-institucional': '#DC2626'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        lg: '8px'
      },
      boxShadow: {
        xl: '0 10px 30px -10px rgba(2,6,23,0.6)'
      }
    }
  },
  plugins: [],
};
