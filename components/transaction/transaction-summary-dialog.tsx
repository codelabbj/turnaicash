"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, AlertCircle, Clock } from "lucide-react"
import { toast } from "react-hot-toast"
import { formatPhoneNumberForDisplay } from "@/lib/utils"
import type { Transaction } from "@/lib/types"

interface TransactionSummaryDialogProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  onCancel: (reference: string) => Promise<void>
  onFinalize: (reference: string) => Promise<void>
  isLoading?: boolean
  /**
   * "pending" → affiché au chargement quand un dépôt précédent est en attente.
   *   - Boutons : "Nouveau dépôt" (annule l'ancien) | "Finaliser"
   *   - Non fermable (pas de X, pas d'Escape, pas de clic extérieur)
   *
   * "created" → affiché juste après la création d'un nouveau dépôt (non utilisé ici).
   *   - Boutons : "Annuler" | "Finaliser"
   *   - Fermable normalement.
   */
  mode?: "pending" | "created"
}

export function TransactionSummaryDialog({
  isOpen,
  onClose,
  transaction,
  onCancel,
  onFinalize,
  isLoading = false,
  mode = "created",
}: TransactionSummaryDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionType, setActionType] = useState<"cancel" | "finalize" | null>(null)

  if (!transaction) return null

  const isPendingMode = mode === "pending"

  const handleOpenChange = (open: boolean) => {
    if (isPendingMode) return // bloque la fermeture
    if (!open) onClose()
  }

  // ── "Nouveau dépôt" (mode pending) ────────────────────────────────────────
  const handleNewDeposit = async () => {
    if (!transaction.reference) {
      toast.error("Référence de transaction manquante")
      return
    }
    setActionType("cancel")
    setIsSubmitting(true)
    try {
      await onCancel(transaction.reference)
      // onCancel gère le toast + fermeture
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        "Erreur lors de l'annulation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // ── "Annuler" (mode created) ───────────────────────────────────────────────
  const handleCancel = async () => {
    if (!transaction.reference) {
      toast.error("Référence de transaction manquante")
      return
    }
    setActionType("cancel")
    setIsSubmitting(true)
    try {
      await onCancel(transaction.reference)
      toast.success("Transaction annulée avec succès")
      onClose()
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        "Erreur lors de l'annulation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  // ── "Finaliser" (les deux modes) ──────────────────────────────────────────
  const handleFinalize = async () => {
    if (!transaction.reference) {
      toast.error("Référence de transaction manquante")
      return
    }
    setActionType("finalize")
    setIsSubmitting(true)
    try {
      await onFinalize(transaction.reference)
      toast.success("Transaction finalisée avec succès")
      onClose()
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        "Erreur lors de la finalisation de la transaction"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
      setActionType(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En attente</Badge>
      case "accept":
        return <Badge variant="default" className="bg-green-100 text-green-800">Acceptée</Badge>
      case "reject":
        return <Badge variant="destructive">Rejetée</Badge>
      case "cancel":
      case "annuler": // ✅ l'API retourne parfois "annuler" en français
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Annulée</Badge>
      case "timeout":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Expirée</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    return type === "deposit"
      ? <Badge variant="default">Dépôt</Badge>
      : <Badge variant="secondary">Retrait</Badge>
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => { if (isPendingMode) e.preventDefault() }}
        onPointerDownOutside={(e) => { if (isPendingMode) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            {isPendingMode ? "Transaction en attente" : "Récapitulatif de la transaction"}
          </DialogTitle>
          <DialogDescription>
            {isPendingMode
              ? "Vous avez un dépôt en attente. Finalisez-le ou créez un nouveau dépôt."
              : "Votre transaction a été créée. Vous pouvez la finaliser ou l'annuler."}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Détails de la transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Type</span>
              {getTypeBadge(transaction.type_trans)}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Statut</span>
              {getStatusBadge(transaction.status)}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Référence</span>
              <span className="font-medium text-xs sm:text-sm break-all">{transaction.reference}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Montant</span>
              <span className="font-semibold">
                {transaction.amount.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "XOF",
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Numéro de téléphone</span>
              <span className="font-medium">{formatPhoneNumberForDisplay(transaction.phone_number)}</span>
            </div>

            {transaction.message && (
              <>
                <Separator />
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900">Message</p>
                      <p className="text-xs text-blue-700 mt-1">{transaction.message}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {transaction.ussd_code && (
              <>
                <Separator />
                <div className="bg-amber-50 p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-amber-900">Code USSD</p>
                      <p className="text-sm font-mono text-amber-700 mt-1 break-all">{transaction.ussd_code}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <DialogFooter className="gap-2 sm:gap-0">
          {isPendingMode ? (
            // ── Mode pending : "Nouveau dépôt" | "Finaliser" ─────────────────
            <>
              <Button
                variant="outline"
                onClick={handleNewDeposit}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="min-w-[120px]"
              >
                {isSubmitting && actionType === "cancel" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Annulation...</>
                ) : (
                  "Nouveau dépôt"
                )}
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="min-w-[120px]"
              >
                {isSubmitting && actionType === "finalize" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalisation...</>
                ) : (
                  "Finaliser"
                )}
              </Button>
            </>
          ) : (
            // ── Mode created : "Annuler" | "Finaliser" ────────────────────────
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="min-w-[100px]"
              >
                {isSubmitting && actionType === "cancel" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Annulation...</>
                ) : (
                  "Annuler"
                )}
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={isSubmitting || isLoading || transaction.status !== "pending"}
                className="min-w-[100px]"
              >
                {isSubmitting && actionType === "finalize" ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Finalisation...</>
                ) : (
                  "Finaliser"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}