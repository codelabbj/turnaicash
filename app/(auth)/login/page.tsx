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
import { Loader2 } from "lucide-react"
import { setupNotifications } from "@/lib/fcm-helper"

const loginSchema = z.object({
  email_or_phone: z.string().min(1, "Email ou téléphone requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

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
        const userId = response.data?.id || response.data?.user_id
        
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
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Connexion</CardTitle>
        <CardDescription className="text-center">Entrez vos identifiants pour accéder à votre compte</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email_or_phone">Email ou Téléphone</Label>
            <Input
              id="email_or_phone"
              type="text"
              placeholder="exemple@email.com ou +225..."
              {...register("email_or_phone")}
              disabled={isLoading}
            />
            {errors.email_or_phone && <p className="text-sm text-destructive">{errors.email_or_phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              disabled={isLoading}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
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
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-muted-foreground text-center">
          Pas encore de compte?{" "}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Créer un compte
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
