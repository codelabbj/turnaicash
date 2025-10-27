"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowDownToLine, ArrowUpFromLine, History, Wallet, Loader2, ArrowRight, RefreshCw } from "lucide-react"
import Link from "next/link"
import { transactionApi } from "@/lib/api-client"
import type { Transaction } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export default function DashboardPage() {
  const { user } = useAuth()
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)

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
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenue, {user?.first_name} {user?.last_name}
        </h1>
        <p className="text-muted-foreground mt-2">Gérez vos dépôts et retraits en toute simplicité</p>
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
        <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer hover:border-deposit">
            <Link href="/dashboard/deposit">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Effectuer un dépôt</CardTitle>
                <ArrowDownToLine className="h-4 w-4 text-deposit" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Rechargez votre compte rapidement</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer hover:border-withdrawal">
            <Link href="/dashboard/withdrawal">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Effectuer un retrait</CardTitle>
                <ArrowUpFromLine className="h-4 w-4 text-withdrawal" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Retirez vos gains facilement</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/history">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Voir l'historique</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Consultez vos transactions</p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Activité récente</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchRecentTransactions}
              disabled={isLoadingTransactions}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/history" className="flex items-center gap-2">
                Voir tout
                <ArrowRight className="h-4 w-4" />
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
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        transaction.type_trans === "deposit" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {transaction.type_trans === "deposit" ? (
                          <ArrowDownToLine className="h-4 w-4" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">#{transaction.reference}</h3>
                          {getTypeBadge(transaction.type_trans)}
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {transaction.app} • {transaction.phone_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {transaction.amount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "XOF",
                          minimumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
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
