import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',  // <-- importante para Next 13+
    './pages/**/*.{ts,tsx}', // si usás carpeta pages
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // si querés, podés extender colores o fuentes acá
    },
  },
  plugins: [],
}

export default config
