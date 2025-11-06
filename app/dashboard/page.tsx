"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowDownToLine, ArrowUpFromLine, Wallet, Loader2, ArrowRight, RefreshCw } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { transactionApi } from "@/lib/api-client"
import type { Transaction } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatPhoneNumberForDisplay } from "@/lib/utils"

export default function DashboardPage() {
  const { user } = useAuth()
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [adImageError, setAdImageError] = useState(false)

  useEffect(() => {
    if (user) {
      fetchRecentTransactions()
    }
  }, [user])

  // Refetch data when the page gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchRecentTransactions()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  const fetchRecentTransactions = async () => {
    try {
      setIsLoadingTransactions(true)
      const data = await transactionApi.getHistory({
        page: 1,
        page_size: 5, // Get only the 5 most recent transactions
      })
      setRecentTransactions(data.results)
    } catch (error) {
      console.error("Error fetching recent transactions:", error)
      toast.error("Erreur lors du chargement des transactions récentes")
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  const getStatusBadge = (status: Transaction["status"]) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "En attente" },
      accept: { variant: "default", label: "Accepté" },
      init_payment: { variant: "secondary", label: "En attente" },
      error: { variant: "destructive", label: "Erreur" },
      reject: { variant: "destructive", label: "Rejeté" },
      timeout: { variant: "outline", label: "Expiré" },
    }
    
    const config = statusConfig[status] || { variant: "outline" as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeBadge = (type: Transaction["type_trans"]) => {
    return (
      <Badge variant={type === "deposit" ? "default" : "secondary"}>
        {type === "deposit" ? "Dépôt" : "Retrait"}
      </Badge>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Bienvenue, {user?.first_name} {user?.last_name}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Gérez vos dépôts et retraits en toute simplicité</p>
      </div>

      {/* Balance card */}
      {/* <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
        <CardHeader>
          <CardDescription className="text-primary-foreground/80">Solde disponible</CardDescription>
          <CardTitle className="text-4xl font-bold">
            {user?.balance?.toLocaleString("fr-FR", {
              style: "currency",
              currency: "XOF",
              minimumFractionDigits: 0,
            }) || "0 FCFA"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button asChild variant="secondary" size="sm" className="text-deposit border-deposit hover:bg-green-500/10">
              <Link href="/dashboard/deposit">
                <ArrowDownToLine className="mr-2 h-4 w-4 text-deposit" />
                Déposer
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="text-withdrawal border-withdrawal hover:bg-blue-500/10">
              <Link href="/dashboard/withdrawal">
                <ArrowUpFromLine className="mr-2 h-4 w-4 text-withdrawal" />
                Retirer
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card> */}

      {/* Quick actions */}
      <div>
        {/* <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Actions rapides</h2> */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial min-w-[120px] sm:min-w-[140px] h-10 sm:h-9">
            <Link href="/dashboard/deposit" className="flex items-center justify-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-deposit" />
              <span className="text-xs sm:text-sm">Dépôt</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial min-w-[120px] sm:min-w-[140px] h-10 sm:h-9">
            <Link href="/dashboard/withdrawal" className="flex items-center justify-center gap-2">
              <ArrowUpFromLine className="h-4 w-4 text-withdrawal" />
              <span className="text-xs sm:text-sm">Retrait</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Advertisement Section */}
      <div className="w-full">
        <Card className="overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors">
          <CardContent className="p-0">
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-muted/30">
              {!adImageError && (
                <Image
                  src="/ad-placeholder.png"
                  alt="Publicité"
                  fill
                  className="object-cover"
                  onError={() => setAdImageError(true)}
                />
              )}
              {adImageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                  <div className="text-center p-4">
                    <p className="text-sm sm:text-base text-muted-foreground font-medium">Espace publicitaire</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Publicité</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Activité récente</h2>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchRecentTransactions}
              disabled={isLoadingTransactions}
              className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Actualiser</span>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              <Link href="/dashboard/history" className="flex items-center gap-1 sm:gap-2">
                <span className="hidden sm:inline">Voir tout</span>
                <span className="sm:hidden">Tout</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
        
        {isLoadingTransactions ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : recentTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">Aucune transaction récente</p>
              <p className="text-sm text-muted-foreground text-center mt-1">Vos transactions apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {recentTransactions.map((transaction) => (
              <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                        transaction.type_trans === "deposit" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {transaction.type_trans === "deposit" ? (
                          <ArrowDownToLine className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpFromLine className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <h3 className="font-semibold text-sm sm:text-base truncate">#{transaction.reference}</h3>
                          {getTypeBadge(transaction.type_trans)}
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {transaction.app} • {formatPhoneNumberForDisplay(transaction.phone_number)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-base sm:text-lg font-semibold">
                        {transaction.amount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "XOF",
                          minimumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), "dd MMM à HH:mm", {
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
      </div>
    </div>
  )
}
