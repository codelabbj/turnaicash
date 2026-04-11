"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Phone,
  CreditCard,
  Calendar,
  FileText,
  User as UserIcon,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { transactionApi } from "@/lib/api-client"
import type { Transaction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatPhoneNumberForDisplay } from "@/lib/utils"

function TransactionDetailContent() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const fetchTransactionDetails = useCallback(async (showLoading = true) => {
    if (!id) return
    if (showLoading) setLoading(true)
    setError(null)
    
    try {
      // First try cache
      const cached = sessionStorage.getItem('cached_transaction')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (String(parsed.id) === String(id) || String(parsed.reference) === String(id)) {
          setTransaction(parsed)
          setLoading(false)
          return
        }
      }

      // Fallback: fetch recent history and look for it
      const response = await transactionApi.getHistory({ page: 1, page_size: 50 })
      const found = response.results?.find?.((t: any) => String(t.id) === String(id) || String(t.reference) === String(id) || String(t.uid) === String(id))
      
      if (found) {
        setTransaction(found)
        sessionStorage.setItem('cached_transaction', JSON.stringify(found))
      } else {
        setError("Transaction introuvable. Veuillez revenir à l'historique.")
      }
    } catch (err: any) {
      console.error("Error fetching details:", err)
      setError(err.message || "Failed to load transaction details")
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTransactionDetails()
  }, [fetchTransactionDetails])

  useEffect(() => {
    if (transaction && transaction.status?.toLowerCase() === "pending" && transaction.created_at) {
      const createdTime = new Date(transaction.created_at).getTime()
      const currentTime = new Date().getTime()
      const diffInSeconds = Math.floor((currentTime - createdTime) / 1000)
      const remaining = Math.max(0, 300 - diffInSeconds)
      setTimeLeft(remaining)
    } else {
      setTimeLeft(null)
    }
  }, [transaction])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      });
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copié dans le presse-papier")
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase()
    switch (s) {
      case "completed":
      case "accept":
      case "approve":
      case "success":
        return (
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3 shadow-sm">
            <CheckCircle2 size={32} className="text-white" />
          </div>
        )
      case "failed":
      case "error":
      case "fail":
      case "reject":
      case "echec":
        return (
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-3 shadow-sm">
            <AlertCircle size={32} className="text-white" />
          </div>
        )
      case "pending":
      case "init_payment":
      case "en attente":
      default:
        return (
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
            <RefreshCw size={32} className="text-muted-foreground animate-spin" />
          </div>
        )
    }
  }

  const getStatusText = (status: string) => {
    const s = status.toLowerCase()
    if (["pending", "init_payment", "en attente"].includes(s)) return "En attente"
    if (["completed", "accept", "approve", "success"].includes(s)) return "Succès"
    if (["failed", "error", "fail", "reject", "echec"].includes(s)) return "Échec"
    return status
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (["completed", "accept", "approve", "success"].includes(s)) return "text-green-500"
    if (["failed", "error", "fail", "reject", "echec"].includes(s)) return "text-red-500"
    return "text-muted-foreground"
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy à HH:mm", { locale: fr })
    } catch (e) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <AlertCircle size={64} className="mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Transaction introuvable</h2>
        <p className="text-muted-foreground mb-6">
          {error || "Nous n'avons pas pu charger les détails de cette transaction."}
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => fetchTransactionDetails()}>Réessayer</Button>
          <Button variant="outline" onClick={() => router.back()}>
            Retour
          </Button>
        </div>
      </div>
    )
  }

  const contactSupport = () => {
    const firstName = user?.first_name || "Utilisateur"
    const lastName = user?.last_name || ""
    const ref = transaction.reference
    const amount = transaction.amount
    const networkName = transaction.network + "" // Fallback to ID if name not present in this project
    const phone = transaction.phone_number
    const appName = transaction.app || "App"
    const appId = transaction.user_app_id || "N/A"
    const transType = transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"

    const message = `Bonjour moi c'est ${firstName} ${lastName}, j'ai besoin d'aide concernant mon ${transType}.\nDate: ${formatDate(
      transaction.created_at
    )}\nRéférence: ${ref}\nMontant: XOF ${amount}\nRéseau: ${networkName}\nTéléphone: ${phone}\n*${appName} ID:* ${appId}`

    window.open(`https://wa.me/22553445327?text=${encodeURIComponent(message)}`, "_blank")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Détails de la transaction</h1>
      </div>

      <div className="flex flex-col items-center py-4">
        {getStatusIcon(transaction.status)}
        <div className="flex items-center gap-2 mb-1">
          <h2 className={`text-lg font-bold ${getStatusColor(transaction.status)}`}>
            {getStatusText(transaction.status)}
          </h2>
          {timeLeft !== null && timeLeft > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-200">
              <Clock className="w-3 h-3" />
              {formatTime(timeLeft)}
            </Badge>
          )}
        </div>
        <p className="text-3xl font-bold mt-2">
          {transaction.amount.toLocaleString("fr-FR", {
            style: "currency",
            currency: "XOF",
            minimumFractionDigits: 0,
          })}
        </p>
      </div>

      {transaction.status?.toLowerCase() === "pending" && (transaction.transaction_link || transaction.ussd_code) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            {transaction.transaction_link ? (
              <Button className="w-full h-12 text-lg font-bold" asChild>
                <a href={transaction.transaction_link} target="_blank" rel="noopener noreferrer">
                  Continuer le paiement
                </a>
              </Button>
            ) : transaction.ussd_code ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Code USSD à composer
                </p>
                <div className="flex items-center justify-between gap-4 bg-background p-3 rounded-lg border">
                  <span className="font-mono font-bold text-xl tracking-widest">{transaction.ussd_code}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(transaction.ussd_code!)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copier
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {transaction.error_message && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{transaction.error_message}</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Type</span>
              <Badge variant={transaction.type_trans === "deposit" ? "default" : "secondary"}>
                {transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}
              </Badge>
            </div>

            <div className="p-4 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Application</p>
                <p className="font-medium">{transaction.app || "N/A"}</p>
              </div>
            </div>

            <div className="p-4 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Numéro</p>
                <p className="font-medium">{formatPhoneNumberForDisplay(transaction.phone_number)}</p>
              </div>
            </div>

            <div className="p-4 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Référence</p>
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate mr-2">{transaction.reference}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(transaction.reference)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(transaction.created_at)}</p>
              </div>
            </div>

            <div className="p-4 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{transaction.app || "App"} ID</p>
                <p className="font-medium">{transaction.user_app_id || "N/A"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 pb-8">
        <Button 
          onClick={contactSupport}
          className="w-full h-12 bg-red-100 hover:bg-red-200 text-red-600 border-none font-bold"
          variant="outline"
        >
          Contacter le support
        </Button>
        <Button variant="outline" className="w-full h-12 font-bold" onClick={() => router.push("/dashboard/history")}>
          Retour à l'historique
        </Button>
      </div>
    </div>
  )
}

export default function ClientTransactionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TransactionDetailContent />
    </Suspense>
  )
}
