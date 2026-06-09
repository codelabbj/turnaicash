"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useGoogleLogin } from "@react-oauth/google"
import { GoogleLogin } from "@react-oauth/google"
import { useAuth } from "@/lib/auth-context"
import { toast } from "react-hot-toast"
import api from "@/lib/api"

interface GoogleButtonProps {
  /** "login" pour Se connecter, "register" pour S'inscrire */
  mode?: "login" | "register"
}

export function GoogleButton({ mode = "login" }: GoogleButtonProps) {
  const { login } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleCredential = async (credential: string) => {
    setIsLoading(true)
    try {
      const response = await api.post("/auth/google", { id_token: credential })
      const { access, refresh, data } = response.data
      login(access, refresh, data)
      toast.success(mode === "register" ? "Compte créé avec succès!" : "Connexion réussie!")
      router.push("/dashboard")
    } catch (error) {
      console.error("Google auth error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* Séparateur */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground tracking-wide">ou</span>
        </div>
      </div>

      {/* Bouton Google style natif */}
      <GoogleLogin
        onSuccess={(res) => {
          if (res.credential) handleCredential(res.credential)
        }}
        onError={() => toast.error("Erreur lors de la connexion avec Google")}
        text={mode === "register" ? "signup_with" : "continue_with"}
        shape="rectangular"
        theme="outline"
        size="large"
        locale="fr"
        width="400"
        useOneTap={false}
      />
    </div>
  )
}
