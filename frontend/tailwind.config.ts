const config = {
    content: [
      './app/**/*.{ts,tsx}',      // Soporta rutas app/
      './pages/**/*.{ts,tsx}',    // Soporta rutas legacy si usás
      './components/**/*.{ts,tsx,js,jsx}', // Componentes si los tenés
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }
  
  export default config
