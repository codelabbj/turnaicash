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
import { authApi } from "@/lib/api-client"
import { toast } from "react-hot-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"

const signupSchema = z
  .object({
    first_name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
    last_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Email invalide"),
    phone: z.string().min(8, "Numéro de téléphone invalide"),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
    re_password: z.string().min(6, "Confirmation requise"),
  })
  .refine((data) => data.password === data.re_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["re_password"],
  })

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    try {
      await authApi.register(data)
      toast.success("Compte créé avec succès! Veuillez vous connecter.")
      router.push("/login")
    } catch (error) {
      // Error is handled by api interceptor
      console.error("Signup error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-1 px-4 sm:px-6 pt-6 sm:pt-6">
        <CardTitle className="text-xl sm:text-2xl font-bold text-center">Créer un compte</CardTitle>
        <CardDescription className="text-center text-sm sm:text-base">Remplissez le formulaire pour créer votre compte</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm sm:text-base">Prénom</Label>
              <Input id="first_name" type="text" placeholder="Jean" {...register("first_name")} disabled={isLoading} className="h-11 sm:h-10 text-base sm:text-sm" />
              {errors.first_name && <p className="text-xs sm:text-sm text-destructive">{errors.first_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm sm:text-base">Nom</Label>
              <Input id="last_name" type="text" placeholder="Dupont" {...register("last_name")} disabled={isLoading} className="h-11 sm:h-10 text-base sm:text-sm" />
              {errors.last_name && <p className="text-xs sm:text-sm text-destructive">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemple@email.com"
              {...register("email")}
              disabled={isLoading}
              className="h-11 sm:h-10 text-base sm:text-sm"
            />
            {errors.email && <p className="text-xs sm:text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm sm:text-base">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+225 01 02 03 04 05"
              {...register("phone")}
              disabled={isLoading}
              className="h-11 sm:h-10 text-base sm:text-sm"
            />
            {errors.phone && <p className="text-xs sm:text-sm text-destructive">{errors.phone.message}</p>}
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

          <div className="space-y-2">
            <Label htmlFor="re_password" className="text-sm sm:text-base">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="re_password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("re_password")}
                disabled={isLoading}
                className="h-11 sm:h-10 text-base sm:text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 sm:h-10 w-10 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.re_password && <p className="text-xs sm:text-sm text-destructive">{errors.re_password.message}</p>}
          </div>

          <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm font-medium" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Créer mon compte"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 px-4 sm:px-6 pb-6 sm:pb-6">
        <div className="text-xs sm:text-sm text-muted-foreground text-center">
          Vous avez déjà un compte?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Se connecter
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
