"use client"
import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

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
  const [users, setUsers] = useState<(User & { password: string })[]>([{
    id: '1',
    name: 'Admin',
    email: 'admin@test.com',
    role: 'admin',
    password: 'Admin123*'
  }])
  const [failedAttempts, setFailedAttempts] = useState(0)

  const isValidEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const isStrongPassword = (password: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
    return regex.test(password)
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    if (failedAttempts >= 5) {
      alert("Demasiados intentos fallidos. Intenta más tarde.")
      return false
    }

    if (!isValidEmail(email)) {
      alert("Formato de email inválido.")
      return false
    }

    const foundUser = users.find(u => u.email === email && u.password === password)
    if (foundUser) {
      const userData = { id: foundUser.id, name: foundUser.name, email: foundUser.email, role: foundUser.role }
      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))
      localStorage.setItem("loginTime", Date.now().toString())
      setFailedAttempts(0)
      return true
    } else {
      setFailedAttempts(prev => prev + 1)
      return false
    }
  }

  const register = async (userData: Omit<User, 'id'> & { password: string }): Promise<boolean> => {
    if (!isValidEmail(userData.email)) {
      alert("Formato de email inválido.")
      return false
    }

    if (!isStrongPassword(userData.password)) {
      alert("La contraseña no es lo suficientemente segura. Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.")
      return false
    }

    const existingUser = users.find(u => u.email === userData.email)
    if (existingUser) {
      alert("Ya existe un usuario registrado con ese email.")
      return false
    }

    const newUser = {
      ...userData,
      id: Date.now().toString()
    }

    setUsers(prev => [...prev, newUser])
    const savedUser = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    setUser(savedUser)
    localStorage.setItem("user", JSON.stringify(savedUser))
    localStorage.setItem("loginTime", Date.now().toString())
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("loginTime")
  }

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    const loginTime = localStorage.getItem("loginTime")
    if (storedUser && loginTime) {
      const currentTime = Date.now()
      const hoursPassed = (currentTime - parseInt(loginTime)) / (1000 * 60 * 60)
      if (hoursPassed < 2) {
        setUser(JSON.parse(storedUser))
      } else {
        logout()
      }
    }
  }, [])

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
