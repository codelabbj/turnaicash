"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Ticket, Copy, Check } from "lucide-react"
import { couponApi, platformApi } from "@/lib/api-client"
import type { Coupon, Platform } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function CouponPage() {
  const { user } = useAuth()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchCoupons()
    fetchPlatforms()
  }, [])

  // Refetch data when the page gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchCoupons()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const fetchPlatforms = async () => {
    try {
      const data = await platformApi.getAll()
      setPlatforms(data)
    } catch (error) {
      console.error("Error fetching platforms:", error)
    }
  }

  const fetchCoupons = async () => {
    setIsLoading(true)
    try {
      const data = await couponApi.getAll(1)
      setCoupons(data.results)
    } catch (error) {
      console.error("Error fetching coupons:", error)
      toast.error("Erreur lors du chargement des coupons")
    } finally {
      setIsLoading(false)
    }
  }

  const getPlatformName = (betAppId: string) => {
    const platform = platforms.find((p) => p.id === betAppId)
    return platform?.name || "Plateforme inconnue"
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Code copié dans le presse-papiers")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Veuillez vous connecter pour voir vos coupons</p>
      </div>
    )
  }


  return (
    <div className="max-w-6xl mx-auto">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Ticket className="h-6 w-6 sm:h-8 sm:w-8" />
            Mes Coupons
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Gérez vos codes promo et coupons
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Coupons List */}
            {coupons.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold">Mes coupons</h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {coupons.map((coupon) => (
                    <Card key={coupon.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg break-words font-mono">
                              {coupon.code}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                              {getPlatformName(coupon.bet_app)}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            Coupon
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                          <span>Créé le:</span>
                          <span className="font-medium">
                            {format(new Date(coupon.created_at), "dd MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-9 text-xs sm:text-sm"
                          onClick={() => copyToClipboard(coupon.code)}
                        >
                          {copiedCode === coupon.code ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Copié
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copier le code
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun coupon disponible</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Vos coupons apparaîtront ici
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

