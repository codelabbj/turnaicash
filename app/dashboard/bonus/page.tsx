"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Gift } from "lucide-react"
import { bonusApi, settingsApi } from "@/lib/api-client"
import type { Bonus } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function BonusPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [referralBonusEnabled, setReferralBonusEnabled] = useState(false)

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const settings = await settingsApi.get()
        const enabled = settings?.referral_bonus === true
        setReferralBonusEnabled(enabled)
        
        if (!enabled) {
          // Redirect to dashboard if referral bonus is disabled
          router.push("/dashboard")
          return
        }
        
        // If enabled, fetch bonuses
        fetchBonuses()
      } catch (error) {
        console.error("Error fetching settings:", error)
        setReferralBonusEnabled(false)
        router.push("/dashboard")
      } finally {
        setIsLoadingSettings(false)
      }
    }
    
    if (user) {
      checkSettings()
    }
  }, [user, router])

  const fetchBonuses = async () => {
    setIsLoading(true)
    try {
      const data = await bonusApi.getAll(1)
      setBonuses(data.results)
    } catch (error) {
      console.error("Error fetching bonuses:", error)
      toast.error("Erreur lors du chargement des bonus")
    } finally {
      setIsLoading(false)
    }
  }

  // Refetch data when the page gains focus
  useEffect(() => {
    if (!referralBonusEnabled) return
    
    const handleFocus = () => {
      fetchBonuses()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [referralBonusEnabled])

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!referralBonusEnabled) {
    return null // Will redirect
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Gift className="h-6 w-6 sm:h-8 sm:w-8" />
          Mes bonus
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Consultez vos bonus de parrainage</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Historique des bonus</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Liste de tous vos bonus reçus</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bonuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gift className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun bonus enregistré</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Vos bonus de parrainage apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bonuses.map((bonus) => (
                <Card key={bonus.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default" className="text-xs sm:text-sm">
                            {parseFloat(bonus.amount).toLocaleString("fr-FR", {
                              style: "currency",
                              currency: "XOF",
                              minimumFractionDigits: 0,
                            })}
                          </Badge>
                        </div>
                        <p className="text-sm sm:text-base font-medium text-foreground mb-1">
                          {bonus.reason_bonus || "Bonus de parrainage"}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {format(new Date(bonus.created_at), "dd MMMM yyyy à HH:mm", {
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

