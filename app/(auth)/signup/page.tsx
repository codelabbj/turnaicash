"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { authApi, settingsApi } from "@/lib/api-client"
import { formatPhoneNumber } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { GoogleButton } from "@/components/google-button"

const baseSignupSchema = z.object({
  first_name: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  last_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  re_password: z.string().min(6, "Confirmation requise"),
})

type SignupFormData = z.infer<typeof baseSignupSchema> & {
  referral_code?: string
}

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [referralBonusEnabled, setReferralBonusEnabled] = useState(false)
  const [useWhatsapp, setUseWhatsapp] = useState(false)
  const [showWhatsappDialog, setShowWhatsappDialog] = useState(false)
  const pendingDataRef = useRef<SignupFormData | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await settingsApi.get()
        setReferralBonusEnabled(settings?.referral_bonus === true)
        setUseWhatsapp(Boolean(settings?.use_whatsapp))
      } catch (error) {
        console.error("Error fetching settings:", error)
        setReferralBonusEnabled(false)
        setUseWhatsapp(false)
      } finally {
        setIsLoadingSettings(false)
      }
    }
    fetchSettings()
  }, [])

  const signupSchema = referralBonusEnabled
    ? baseSignupSchema
        .extend({
          referral_code: z.string().optional(),
        })
        .refine((data) => data.password === data.re_password, {
          message: "Les mots de passe ne correspondent pas",
          path: ["re_password"],
        })
    : baseSignupSchema.refine((data) => data.password === data.re_password, {
        message: "Les mots de passe ne correspondent pas",
        path: ["re_password"],
      })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const registerUser = async (data: SignupFormData, whatsappVerified: boolean) => {
    const fullPhone = formatPhoneNumber(data.phone)
    const registrationData: Parameters<typeof authApi.register>[0] = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      re_password: data.re_password,
    }

    if (referralBonusEnabled && data.referral_code) {
      registrationData.referral_code = data.referral_code
    }

    if (useWhatsapp && fullPhone) {
      registrationData.user_whatsapp_phone = fullPhone
      registrationData.whatsapp_verified = whatsappVerified
    }

    await authApi.register(registrationData)
    setShowWhatsappDialog(false)
    pendingDataRef.current = null
    toast.success("Compte créé avec succès! Veuillez vous connecter.")
    router.push("/login")
  }

  const onSubmit = async (data: SignupFormData, skipWhatsappCheck = false) => {
    setIsLoading(true)
    try {
      const fullPhone = formatPhoneNumber(data.phone)
      let whatsappVerified = false

      if (useWhatsapp && !skipWhatsappCheck) {
        pendingDataRef.current = data
        try {
          const check = await authApi.checkWhatsappPhone(fullPhone)
          if (check?.success) {
            whatsappVerified = true
          } else {
            setShowWhatsappDialog(true)
            return
          }
        } catch (error: any) {
          const message = error?.response?.data?.message
          if (message === "NUMBER_NOT_ON_WHATSAPP" || message === "INVALID_PHONE") {
            setShowWhatsappDialog(true)
            return
          }
          if (message !== "WHATSAPP_DISABLED") {
            toast.error("Impossible de vérifier ce numéro WhatsApp. Réessayez.")
            return
          }
        }
      }

      await registerUser(data, whatsappVerified)
    } catch (error) {
      console.error("Signup error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterWithoutWhatsapp = () => {
    const data = pendingDataRef.current
    if (!data) {
      setShowWhatsappDialog(false)
      return
    }
    void onSubmit(data, true)
  }

  if (isLoadingSettings) {
    return (
      <Card className="border-border/50 shadow-xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {showWhatsappDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl border">
            <h2 className="text-lg font-bold">Numéro WhatsApp introuvable</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Ce numéro n&apos;a pas été trouvé sur WhatsApp. Vous pourrez le configurer plus tard
              dans votre profil (WhatsApp / Telegram).
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                onClick={handleRegisterWithoutWhatsapp}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Inscription...
                  </>
                ) : (
                  "Continuer"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWhatsappDialog(false)}
                disabled={isLoading}
                className="w-full"
              >
                Modifier le numéro
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="border-border/50 shadow-xl">
        <CardHeader className="space-y-1 px-4 sm:px-6 pt-6 sm:pt-6">
          <CardTitle className="text-xl sm:text-2xl font-bold text-center">Créer un compte</CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            Remplissez le formulaire pour créer votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm sm:text-base">
                  Prénom
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Jean"
                  {...register("first_name")}
                  disabled={isLoading}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
                {errors.first_name && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm sm:text-base">
                  Nom
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Dupont"
                  {...register("last_name")}
                  disabled={isLoading}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
                {errors.last_name && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                {...register("email")}
                disabled={isLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
              {errors.email && (
                <p className="text-xs sm:text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm sm:text-base">
                {useWhatsapp ? "Numéro WhatsApp" : "Téléphone"}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+225 01 02 03 04 05"
                {...register("phone")}
                disabled={isLoading}
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
              {useWhatsapp && (
                <p className="text-xs text-muted-foreground">
                  Ce numéro sera enregistré pour les notifications WhatsApp.
                </p>
              )}
              {errors.phone && (
                <p className="text-xs sm:text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">
                Mot de passe
              </Label>
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
              {errors.password && (
                <p className="text-xs sm:text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="re_password" className="text-sm sm:text-base">
                Confirmer le mot de passe
              </Label>
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
              {errors.re_password && (
                <p className="text-xs sm:text-sm text-destructive">{errors.re_password.message}</p>
              )}
            </div>

            {referralBonusEnabled && (
              <div className="space-y-2">
                <Label htmlFor="referral_code" className="text-sm sm:text-base">
                  Code de parrainage (optionnel)
                </Label>
                <Input
                  id="referral_code"
                  type="text"
                  placeholder="Entrez un code de parrainage"
                  {...register("referral_code")}
                  disabled={isLoading}
                  className="h-11 sm:h-10 text-base sm:text-sm"
                />
                {errors.referral_code && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.referral_code.message}</p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 sm:h-10 text-base sm:text-sm font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Créer mon compte"
              )}
            </Button>

            <GoogleButton mode="register" />
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
    </>
  )
}
