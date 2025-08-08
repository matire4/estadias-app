// app/layout.tsx
import "./globals.css"
import { AuthProvider } from "./context/AuthContext"

export const metadata = {
  title: "Gestión de Estadías",
  description: "App para administrar estadías",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-100 text-gray-900">
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
