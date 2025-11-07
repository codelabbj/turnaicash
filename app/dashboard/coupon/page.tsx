"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Ticket, Plus, Copy, Check } from "lucide-react"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface Coupon {
  id: string
  code: string
  description: string
  discount: number
  discount_type: "percentage" | "fixed"
  valid_from: string
  valid_until: string
  is_used: boolean
  used_at?: string
}

export default function CouponPage() {
  const { user } = useAuth()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [couponCode, setCouponCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchCoupons()
  }, [])

  // Refetch data when the page gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchCoupons()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const fetchCoupons = async () => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      // const data = await couponApi.getAll()
      // For now, using mock data
      const mockCoupons: Coupon[] = [
        {
          id: "1",
          code: "WELCOME10",
          description: "Code de bienvenue - 10% de réduction",
          discount: 10,
          discount_type: "percentage",
          valid_from: new Date().toISOString(),
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_used: false,
        },
        {
          id: "2",
          code: "BONUS5000",
          description: "Bonus fixe de 5000 FCFA",
          discount: 5000,
          discount_type: "fixed",
          valid_from: new Date().toISOString(),
          valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          is_used: true,
          used_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]
      setCoupons(mockCoupons)
    } catch (error) {
      console.error("Error fetching coupons:", error)
      toast.error("Erreur lors du chargement des coupons")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Veuillez entrer un code coupon")
      return
    }

    setIsSubmitting(true)
    try {
      // TODO: Replace with actual API call
      // await couponApi.redeem(couponCode.trim())
      toast.success("Coupon appliqué avec succès!")
      setCouponCode("")
      fetchCoupons()
    } catch (error) {
      console.error("Error redeeming coupon:", error)
      toast.error("Erreur lors de l'application du coupon")
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Code copié dans le presse-papiers")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const isCouponValid = (coupon: Coupon) => {
    const now = new Date()
    const validFrom = new Date(coupon.valid_from)
    const validUntil = new Date(coupon.valid_until)
    return now >= validFrom && now <= validUntil && !coupon.is_used
  }

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount}%`
    }
    return `${coupon.discount.toLocaleString("fr-FR")} FCFA`
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Veuillez vous connecter pour voir vos coupons</p>
      </div>
    )
  }

  const activeCoupons = coupons.filter(isCouponValid)
  const usedCoupons = coupons.filter(c => c.is_used)
  const expiredCoupons = coupons.filter(c => {
    const now = new Date()
    const validUntil = new Date(c.valid_until)
    return !c.is_used && now > validUntil
  })

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

        {/* Redeem Coupon Section */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              Utiliser un code coupon
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Entrez votre code coupon pour l'appliquer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Entrez le code coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 h-11 sm:h-10 text-base sm:text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRedeemCoupon()
                  }
                }}
              />
              <Button
                onClick={handleRedeemCoupon}
                disabled={isSubmitting || !couponCode.trim()}
                className="w-full sm:w-auto h-11 sm:h-10 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Application...
                  </>
                ) : (
                  "Appliquer"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Coupons */}
            {activeCoupons.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold">Coupons actifs</h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {activeCoupons.map((coupon) => (
                    <Card key={coupon.id} className="border-green-500/30 bg-green-500/5">
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg break-words">
                              {coupon.code}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                              {coupon.description}
                            </CardDescription>
                          </div>
                          <Badge variant="default" className="flex-shrink-0">
                            {formatDiscount(coupon)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                          <span>Valide jusqu'au:</span>
                          <span className="font-medium">
                            {format(new Date(coupon.valid_until), "dd MMM yyyy", { locale: fr })}
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
            )}

            {/* Used Coupons */}
            {usedCoupons.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold">Coupons utilisés</h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {usedCoupons.map((coupon) => (
                    <Card key={coupon.id} className="opacity-60">
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg break-words">
                              {coupon.code}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                              {coupon.description}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {formatDiscount(coupon)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          Utilisé le: {coupon.used_at && format(new Date(coupon.used_at), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Coupons */}
            {expiredCoupons.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold">Coupons expirés</h2>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {expiredCoupons.map((coupon) => (
                    <Card key={coupon.id} className="opacity-60">
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg break-words">
                              {coupon.code}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1">
                              {coupon.description}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0">
                            {formatDiscount(coupon)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          Expiré le: {format(new Date(coupon.valid_until), "dd MMM yyyy", { locale: fr })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {coupons.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun coupon disponible</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Utilisez un code coupon ci-dessus pour commencer
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

