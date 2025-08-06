"use client"
import { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'usuario'
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<(User & { password: string })[]>([
    { id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin', password: 'admin123' }
  ])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simular delay de autenticación
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const foundUser = users.find(u => u.email === email && u.password === password)
    if (foundUser) {
      setUser({ id: foundUser.id, name: foundUser.name, email: foundUser.email, role: foundUser.role })
      return true
    }
    return false
  }

  const register = async (userData: Omit<User, 'id'> & { password: string }): Promise<boolean> => {
    // Simular delay de registro
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const existingUser = users.find(u => u.email === userData.email)
    if (existingUser) {
      return false // Usuario ya existe
    }

    const newUser = {
      ...userData,
      id: Date.now().toString()
    }
    
    setUsers(prev => [...prev, newUser])
    setUser({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role })
    return true
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
