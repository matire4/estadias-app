"use client"

import { AuthProvider } from "./context/AuthContext"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Calendar from "./pages/Calendar"
import NewEstadia from "./pages/NewEstadia"
import EditEstadia from "./pages/EditEstadia"
import "./globals.css"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = typeof window !== "undefined" && localStorage.getItem("token") !== null
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

export default function RootLayout() {
  return (
    <html lang="es">
      <body className="bg-gray-100 text-gray-900">
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/calendar"
                  element={
                    <ProtectedRoute>
                      <Calendar />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/estadia/new"
                  element={
                    <ProtectedRoute>
                      <NewEstadia />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/estadia/edit/:id"
                  element={
                    <ProtectedRoute>
                      <EditEstadia />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/calendar" />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </body>
    </html>
  )
}
