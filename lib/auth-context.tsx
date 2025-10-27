"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { User } from "./types"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isHydrated: boolean
  login: (accessToken: string, refreshToken: string, userData: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Mark as hydrated first
    setIsHydrated(true)
    
    // Then check localStorage
    const accessToken = localStorage.getItem("access_token")
    const userData = localStorage.getItem("user_data")
    
    console.log("AuthProvider useEffect - accessToken:", accessToken)
    console.log("AuthProvider useEffect - userData:", userData)

    if (accessToken && userData && userData !== "undefined" && userData !== "null") {
      try {
        const parsedUser = JSON.parse(userData)
        console.log("Parsed user data:", parsedUser)
        setUser(parsedUser)
      } catch (error) {
        console.error("Failed to parse user data:", error)
        localStorage.clear()
      }
    }
    setIsLoading(false)
  }, [])

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    console.log("Login called with:", { accessToken, refreshToken, userData })
    localStorage.setItem("access_token", accessToken)
    localStorage.setItem("refresh_token", refreshToken)
    localStorage.setItem("user_data", JSON.stringify(userData))
    setUser(userData)
    console.log("User set to:", userData)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, isLoading, isHydrated, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
