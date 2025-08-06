"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Calendar from './pages/Calendar'
import EstadiaForm from './pages/EstadiaForm'
import './globals.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function AppRoutes() {
  return (
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
            <EstadiaForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/estadia/edit/:id" 
        element={
          <ProtectedRoute>
            <EstadiaForm />
          </ProtectedRoute>
        } 
      />
      <Route path="/" element={<Navigate to="/calendar" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}
