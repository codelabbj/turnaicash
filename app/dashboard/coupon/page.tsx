"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Ticket, Copy, Check, Sparkles, Lock } from "lucide-react"
import Link from "next/link"
import { couponApi, platformApi, predictionsApi, type TodayPredictionsResponse } from "@/lib/api-client"
import type { Coupon, Platform } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function CouponPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<"pronos" | "codes">("pronos")
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [today, setToday] = useState<TodayPredictionsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    const handleFocus = () => fetchAll()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  const fetchAll = async () => {
    setIsLoading(true)
    try {
      const [pred, codes, plats] = await Promise.all([
        predictionsApi.getToday().catch(() => null),
        couponApi.getAll(1),
        platformApi.getAll().catch(() => []),
      ])
      setToday(pred)
      setCoupons(codes.results)
      setPlatforms(plats)
    } catch (error) {
      console.error(error)
      toast.error("Erreur lors du chargement")
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
        <p className="text-muted-foreground">Veuillez vous connecter pour voir les pronos</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
            Pronos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Analyses du jour et codes bookmakers
          </p>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant={tab === "pronos" ? "default" : "outline"} onClick={() => setTab("pronos")}>
              Aujourd&apos;hui
            </Button>
            <Button size="sm" variant={tab === "codes" ? "default" : "outline"} onClick={() => setTab("codes")}>
              Codes coupons
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : tab === "pronos" ? (
          today?.locked ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground max-w-md">
                  {today.detail ||
                    "Pour voir les pronos, effectuez un dépôt ou un retrait au cours des 7 derniers jours."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button asChild>
                    <Link href="/dashboard/deposit">Faire un dépôt</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/withdrawal">Faire un retrait</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !today?.groups?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun prono pour aujourd&apos;hui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {today.groups
                .map((group) => ({
                  ...group,
                  predictions: group.predictions.filter((p) => p.status !== "finished"),
                }))
                .filter((group) => group.predictions.length > 0)
                .map((group) => (
                <section key={group.competition.slug}>
                  <h2 className="text-sm font-semibold tracking-wider uppercase text-sky-500 mb-3">
                    {group.competition.name}
                  </h2>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {group.predictions.map((p) => (
                      <article
                        key={p.id}
                        className="rounded-xl border border-slate-700/80 bg-slate-900 text-slate-100 p-4"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                          <span>{group.competition.name}</span>
                          <span className="font-semibold text-slate-200">{p.status_label}</span>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2">
                            {p.home.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.home.logo} alt="" className="w-7 h-7 object-contain" />
                            ) : null}
                            <span className="flex-1 text-sm font-medium truncate">{p.home.name}</span>
                            <span className="tabular-nums font-semibold">{p.score_home ?? "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.away.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.away.logo} alt="" className="w-7 h-7 object-contain" />
                            ) : null}
                            <span className="flex-1 text-sm font-medium truncate">{p.away.name}</span>
                            <span className="tabular-nums font-semibold">{p.score_away ?? "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-teal-400 font-semibold mb-1">
                              Meilleur pari
                            </p>
                            <span className="inline-flex rounded-md border border-emerald-500/60 px-2 py-1 text-xs text-emerald-300">
                              {p.best_pari?.label || p.best_market_label}
                            </span>
                          </div>
                          {p.outcome_label && (
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-semibold",
                                p.outcome === "won" && "bg-emerald-500 text-white",
                                p.outcome === "lost" && "bg-rose-500 text-white",
                                p.outcome === "void" && "bg-slate-500 text-white",
                              )}
                            >
                              {p.outcome_label}
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : coupons.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Codes coupons</h2>
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
              <p className="text-muted-foreground">Aucun code disponible</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
