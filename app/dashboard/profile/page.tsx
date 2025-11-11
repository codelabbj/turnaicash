"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, User, Save, Eye, EyeOff, Lock } from "lucide-react"
import { authApi } from "@/lib/api-client"
import type { User } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

const profileSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
})

const passwordSchema = z
  .object({
    old_password: z.string().min(1, "L'ancien mot de passe est requis"),
    new_password: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
    confirm_new_password: z.string().min(6, "La confirmation est requise"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "Les nouveaux mots de passe ne correspondent pas",
    path: ["confirm_new_password"],
  })

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const router = useRouter()
  const { user: authUser, login } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (!authUser) {
      router.push("/login")
      return
    }
    fetchProfile()
  }, [authUser, router])

  const fetchProfile = async () => {
    setIsLoading(true)
    try {
      const userData = await authApi.getProfile()
      setProfile(userData)
      reset({
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        email: userData.email || "",
        phone: userData.phone || "",
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Erreur lors du chargement du profil")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    try {
      const updatedUser = await authApi.updateProfile(data)
      setProfile(updatedUser)
      
      // Update auth context with new user data
      if (authUser) {
        login(
          localStorage.getItem("access_token") || "",
          localStorage.getItem("refresh_token") || "",
          updatedUser
        )
      }
      
      toast.success("Profil mis à jour avec succès!")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Erreur lors de la mise à jour du profil")
    } finally {
      setIsSubmitting(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true)
    try {
      await authApi.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
        confirm_new_password: data.confirm_new_password,
      })
      toast.success("Mot de passe modifié avec succès!")
      resetPassword()
      setShowOldPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
    } catch (error) {
      console.error("Error changing password:", error)
      toast.error("Erreur lors de la modification du mot de passe")
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (!authUser) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <User className="h-6 w-6 sm:h-8 sm:w-8" />
          Mon profil
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          Gérez vos informations personnelles
        </p>
      </div>

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Informations personnelles</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Modifiez vos informations de profil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm sm:text-base">
                  Prénom
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Votre prénom"
                  {...register("first_name")}
                  disabled={isSubmitting}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
                {errors.first_name && (
                  <p className="text-xs sm:text-sm text-destructive">
                    {errors.first_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm sm:text-base">
                  Nom
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Votre nom"
                  {...register("last_name")}
                  disabled={isSubmitting}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
                {errors.last_name && (
                  <p className="text-xs sm:text-sm text-destructive">
                    {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                {...register("email")}
                disabled={isSubmitting}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
              {errors.email && (
                <p className="text-xs sm:text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm sm:text-base">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+225 01 02 03 04 05"
                {...register("phone")}
                disabled={isSubmitting}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
              {errors.phone && (
                <p className="text-xs sm:text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial h-11 sm:h-10 text-sm"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-initial h-11 sm:h-10 text-sm">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Modifiez votre mot de passe pour sécuriser votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="old_password" className="text-sm sm:text-base">
                Ancien mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="old_password"
                  type={showOldPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...registerPassword("old_password")}
                  disabled={isChangingPassword}
                  className="h-11 sm:h-10 text-base sm:text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 sm:h-10 w-10 hover:bg-transparent"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  disabled={isChangingPassword}
                >
                  {showOldPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.old_password && (
                <p className="text-xs sm:text-sm text-destructive">
                  {passwordErrors.old_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-sm sm:text-base">
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...registerPassword("new_password")}
                  disabled={isChangingPassword}
                  className="h-11 sm:h-10 text-base sm:text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 sm:h-10 w-10 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isChangingPassword}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.new_password && (
                <p className="text-xs sm:text-sm text-destructive">
                  {passwordErrors.new_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_new_password" className="text-sm sm:text-base">
                Confirmer le nouveau mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="confirm_new_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...registerPassword("confirm_new_password")}
                  disabled={isChangingPassword}
                  className="h-11 sm:h-10 text-base sm:text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-11 sm:h-10 w-10 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isChangingPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.confirm_new_password && (
                <p className="text-xs sm:text-sm text-destructive">
                  {passwordErrors.confirm_new_password.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetPassword()
                  setShowOldPassword(false)
                  setShowNewPassword(false)
                  setShowConfirmPassword(false)
                }}
                disabled={isChangingPassword}
                className="flex-1 sm:flex-initial h-11 sm:h-10 text-sm"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isChangingPassword}
                className="flex-1 sm:flex-initial h-11 sm:h-10 text-sm"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Modification...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Modifier le mot de passe
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Information Card */}
      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Informations du compte</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Informations en lecture seule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Nom d'utilisateur</Label>
                <p className="text-sm sm:text-base font-medium mt-1">{profile.username}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">ID utilisateur</Label>
                <p className="text-sm sm:text-base font-medium mt-1 font-mono text-xs">
                  {profile.id}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Date d'inscription</Label>
                <p className="text-sm sm:text-base font-medium mt-1">
                  {format(new Date(profile.date_joined), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Dernière connexion</Label>
                <p className="text-sm sm:text-base font-medium mt-1">
                  {profile.last_login
                    ? format(new Date(profile.last_login), "dd MMMM yyyy à HH:mm", { locale: fr })
                    : "Jamais"}
                </p>
              </div>
              {profile.referral_code && (
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Code de parrainage</Label>
                  <p className="text-sm sm:text-base font-medium mt-1 font-mono">
                    {profile.referral_code}
                  </p>
                </div>
              )}
              {profile.bonus_available !== undefined && (
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Bonus disponible</Label>
                  <p className="text-sm sm:text-base font-medium mt-1">
                    {profile.bonus_available.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "XOF",
                      minimumFractionDigits: 0,
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

