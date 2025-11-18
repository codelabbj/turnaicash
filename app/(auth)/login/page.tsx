"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api-client"
import { toast } from "react-hot-toast"
import { Loader2, Eye, EyeOff, Download } from "lucide-react"
import { setupNotifications } from "@/lib/fcm-helper"

const loginSchema = z.object({
  email_or_phone: z.string().min(1, "Email ou téléphone requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

type LoginFormData = z.infer<typeof loginSchema>

const APK_DOWNLOAD_URL = "/app-v1.0.5.apk"
const APK_FILE_NAME = "TurainCash-v1.0.5.apk"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      // Step 1: Authenticate user
      const response = await authApi.login(data.email_or_phone, data.password)
      login(response.access, response.refresh, response.data)
      
      // Step 2: Show success toast first
      toast.success("Connexion réussie!")
      
      // Step 3: Request notification permission (shows native browser prompt)
      try {
        const userId = response.data?.id
        
        if (userId) {
          // Add small delay to ensure page is ready
          await new Promise(resolve => setTimeout(resolve, 100))
          
          console.log('[Login] Setting up notifications for user:', userId)
          const fcmToken = await setupNotifications(userId)
          
          if (fcmToken) {
            toast.success("Notifications activées!")
            console.log('[Login] FCM Token registered:', fcmToken.substring(0, 20) + '...')
          } else {
            console.log('[Login] No FCM token - permission might be denied or not granted')
          }
        }
      } catch (fcmError) {
        // Non-critical error - don't block login
        console.error('[Login] Error setting up notifications:', fcmError)
      }
      
      // Step 4: Redirect to dashboard
      // Wait a bit more to ensure notification prompt completes if shown
      await new Promise(resolve => setTimeout(resolve, 300))
      router.push("/dashboard")
    } catch (error) {
      // Error is handled by api interceptor
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="space-y-1 px-4 sm:px-6 pt-6 sm:pt-6">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">Connexion</CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">Entrez vos identifiants pour accéder à votre compte</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email_or_phone" className="text-sm sm:text-base">Email ou Téléphone</Label>
              <Input
                id="email_or_phone"
                type="text"
                placeholder="exemple@email.com ou +225..."
                {...register("email_or_phone")}
                disabled={isLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
              {errors.email_or_phone && <p className="text-xs sm:text-sm text-destructive">{errors.email_or_phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  disabled={isLoading}
                  className="h-11 sm:h-10 text-base sm:text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 sm:h-10 w-10 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && <p className="text-xs sm:text-sm text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm font-medium" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 px-4 sm:px-6 pb-6 sm:pb-6">
          <div className="text-xs sm:text-sm text-muted-foreground text-center">
            Pas encore de compte?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Créer un compte
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Button
        asChild
        variant="outline"
        className="w-full h-11 sm:h-10 text-base sm:text-sm font-medium flex items-center justify-center gap-2"
      >
        <a href={APK_DOWNLOAD_URL} download={APK_FILE_NAME} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Télécharger l'application mobile
        </a>
      </Button>
    </div>
  )
}
