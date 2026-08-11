"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Copy, RefreshCw, CheckCircle2, AlertCircle, Smartphone, Phone, CreditCard, Calendar, FileText, Contact, Clock, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { transactionApi } from "@/lib/api-client"
import type { Transaction } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { SupportChatbot } from "@/components/SupportChatbot"

import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatPhoneNumberForDisplay } from "@/lib/utils"

function TransactionDetailContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const router = useRouter()
  const { user } = useAuth()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [claimMessage, setClaimMessage] = useState("")

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

  const getStatusIcon = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "success":
      case "completed":
      case "accept":
      case "approve":
        return (
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <CheckCircle2 size={32} className="text-white" />
            </div>
        )
      case "pending":
      case "init_payment":
        return (
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                <RefreshCw size={32} className="text-gray-400 animate-[spin_3s_linear_infinite]" />
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

  if (!id) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <AlertCircle size={64} className="mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">ID Manquant</h2>
        <p className="text-muted-foreground mb-6">
          Aucun identifiant de transaction n'a été fourni.
        </p>
        <Button onClick={() => router.push("/dashboard/history")}>
          Retour à l'historique
        </Button>
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

  const openAssistantWithClaim = () => {
    const firstName = user?.first_name || "Utilisateur"
    const lastName = user?.last_name || ""
    const ref = transaction.reference
    const amount = transaction.amount
    const networkName = transaction.network + "" 
    const phone = transaction.phone_number
    const appId = transaction.user_app_id || "N/A"
    const transType = transaction.type_trans === "deposit" ? "dépôt" : "retrait"

    const message =
      `Bonjour moi c'est ${firstName} ${lastName}, j'ai besoin d'aide concernant mon ${transType}.\n` +
      `Type: ${transType}\n` +
      `Date: ${formatDate(transaction.created_at)}\n` +
      `Référence: ${ref}\n` +
      `Montant: XOF ${amount}\n` +
      `Réseau: ${networkName}\n` +
      `Téléphone: ${phone}\n` +
      `ID joueur: ${appId}`

    setClaimMessage(message)
    setIsChatOpen(true)
  }

  return (
    <div className="max-w-2xl mx-auto pb-12 px-2 flex flex-col">
      <div className="flex items-center gap-2 mb-4 pt-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center pr-10">Détails du {transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}</h1>
      </div>

      <div className="w-full flex flex-col items-center">
        <div className="mt-0.5 relative">
          {getStatusIcon(transaction.status)}
        </div>

        <div className="flex items-center justify-center gap-2 mb-0">
          <h2 className={`text-lg font-bold ${getStatusColor(transaction.status)}`}>
            {getStatusText(transaction.status)}
          </h2>
          {timeLeft !== null && timeLeft > 0 && (
             <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-mono text-sm bg-amber-50 dark:bg-amber-900/20 px-2.5 py-0.5 rounded-full">
               <Clock className="w-3.5 h-3.5" />
               {formatTime(timeLeft)}
             </div>
          )}
          {timeLeft === 0 && transaction.status?.toLowerCase() === 'pending' && (
             <span className="text-xs font-bold text-red-500">Expiré</span>
          )}
        </div>
        <p className="text-gray-400 text-xs mb-2">
           {transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"} {transaction.status?.toLowerCase() === "pending" ? "en cours" : ""}
        </p>
        <div className="text-2xl font-bold dark:text-white text-slate-900 mb-3">
            XOF {transaction.amount.toLocaleString()}
        </div>

        {/* Message Box */}
        <div className="w-full bg-[#EBF5FF] border-[#D1E9FF] dark:bg-blue-900/10 dark:border-blue-900/30 rounded-xl p-2 mb-3 border">
            <div className="flex items-center gap-1.5 mb-0.5">
                <AlertCircle size={14} className="text-blue-400" />
                <span className="font-bold text-[#1E3A8A] dark:text-blue-300 text-xs">Message</span>
            </div>
            <p className="text-[#1E3A8A] dark:text-blue-200 text-xs leading-snug">
                {transaction.error_message || (transaction.status?.toLowerCase() === "pending" ? `${transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"} en cours` : "Paiement effectué avec succès.")}
            </p>
        </div>

        {/* USSD Box */}
        {transaction.status?.toLowerCase() === "pending" && transaction.ussd_code && (
            <div className="w-full bg-[#EBF5FF] border-[#D1E9FF] dark:bg-blue-900/10 dark:border-blue-900/30 rounded-xl p-2 mb-3 border">
                <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                        <Smartphone size={14} className="text-blue-400" />
                        <span className="font-bold text-[#1E3A8A] dark:text-blue-300 text-xs">Paiement USSD</span>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-white/50 dark:bg-black/20 p-2.5 rounded-lg border border-blue-200/50 dark:border-blue-900/30">
                    <span className="font-mono text-base sm:text-lg font-bold tracking-widest dark:text-white text-slate-900 break-all">
                        {transaction.ussd_code}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                        <button
                            onClick={() => window.location.href = `tel:${encodeURIComponent(transaction.ussd_code!)}`}
                            className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-blue-600 text-white rounded-md text-[11px] sm:text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                            <Phone size={12} fill="white" />
                            Appeler
                        </button>
                        <button
                            onClick={() => copyToClipboard(transaction.ussd_code!)}
                            className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-md border text-[11px] sm:text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 border-blue-100 bg-white text-blue-600 dark:border-slate-800 dark:bg-slate-800 dark:text-blue-400"
                        >
                            <Copy size={12} />
                            Copier
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Transaction Link */}
        {transaction.status?.toLowerCase() === "pending" && transaction.transaction_link && (
            <div className="w-full mb-4">
                <a
                    href={transaction.transaction_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold transition-all shadow-lg flex items-center justify-center gap-3"
                >
                    Continuer le paiement
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </a>
            </div>
        )}

        {/* Details Card */}
        <div className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl p-3 shadow-sm mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Informations du {transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}
            </h3>
            <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                    <span className="text-gray-400 text-xs">Type</span>
                    <span className="font-bold uppercase text-xs dark:text-white text-slate-900">{transaction.type_trans === "deposit" ? "Dépôt" : "Retrait"}</span>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                            <CreditCard size={16} />
                        </div>
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Application</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">{transaction.app || "N/A"}</span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Phone className="text-gray-400" size={16} />
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Numéro</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">{formatPhoneNumberForDisplay(transaction.phone_number)}</span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 text-gray-400">
                        <span className="font-bold text-lg">$</span>
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Montant</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">XOF {transaction.amount.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <FileText className="text-gray-400" size={16} />
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Référence</span>
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm dark:text-white text-slate-900 truncate max-w-[180px]">{transaction.reference}</span>
                            <button onClick={() => copyToClipboard(transaction.reference)} className="text-blue-400 hover:text-blue-500">
                                <Copy size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Calendar className="text-gray-400" size={16} />
                    </div>
                    <div className="flex flex-col flex-1 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                        <span className="text-gray-400 text-[10px]">Date</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">
                            {formatDate(transaction.created_at)}
                        </span>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Contact className="text-gray-400" size={16} />
                    </div>
                    <div className="flex flex-col flex-1">
                        <span className="text-gray-400 text-[10px]">{transaction.app || "App"} ID</span>
                        <span className="font-semibold text-sm dark:text-white text-slate-900">{transaction.user_app_id || "N/A"}</span>
                    </div>
                </div>

            </div>
        </div>

        <button
            onClick={openAssistantWithClaim}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-base font-bold transition-colors shadow-sm mt-3"
        >
            ENVOYER UNE RÉCLAMATION
        </button>

        <button
            onClick={() => router.push("/dashboard/history")}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-base font-bold transition-colors shadow-sm mt-3 mb-8"
        >
            Retour à l'historique
        </button>

      </div>

      {isChatOpen && (
        <div className="fixed inset-0 z-[110] flex flex-col justify-end sm:justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg mx-auto flex flex-col bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl h-[min(80vh,640px)] max-h-[calc(100dvh-2rem)]">
            <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
              <div>
                <p className="font-bold text-lg">Assistant IA</p>
                <p className="text-sm text-muted-foreground">Réclamation concernant cette transaction</p>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="w-10 h-10 border border-border rounded-xl flex items-center justify-center"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 px-3 pb-3">
              <SupportChatbot
                hideHeader
                pageKey="transaction_detail"
                route="/dashboard/history/detail"
                screenTitle="Réclamation transaction"
                initialMessage={claimMessage}
              />
            </div>
          </div>
        </div>
      )}
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
