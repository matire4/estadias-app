// /frontend/app/layout.tsx
import "./globals.css"
import { AuthProvider } from "./context/AuthContext"
import TopNav from "@/components/TopNav"
import Toaster from "@/components/Toaster"  // <-- NUEVO

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
            <TopNav />
            <Toaster /> {/* <-- NUEVO: toasts globales */}
            <main className="max-w-6xl mx-auto px-4 py-6">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
