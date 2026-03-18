"use client"

// new version
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { TransactionProgressBar } from "@/components/transaction/progress-bar"
import { ConfirmationDialog } from "@/components/transaction/confirmation-dialog"
import { PlatformStep } from "@/components/transaction/steps/platform-step"
import { BetIdStep } from "@/components/transaction/steps/bet-id-step"
import { NetworkStep } from "@/components/transaction/steps/network-step"
import { PhoneStep } from "@/components/transaction/steps/phone-step"
import { AmountStep } from "@/components/transaction/steps/amount-step"
import { transactionApi, settingsApi } from "@/lib/api-client"
import type { Platform, UserAppId, Network, UserPhone } from "@/lib/types"
import { toast } from "react-hot-toast"
import { extractTimeErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Copy } from "lucide-react"

import { TransactionSummaryDialog } from "@/components/transaction/transaction-summary-dialog"
import type { Transaction } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function DepositPage() {
  const router = useRouter()
  const { user } = useAuth()

  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 5

  // ── Pending transaction check (on mount) ─────────────────────────────────
  const [pendingTransaction, setPendingTransaction] = useState<Transaction | null>(null)
  const [isPendingCheckDone, setIsPendingCheckDone] = useState(false)
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false)
  const [isPendingSubmitting, setIsPendingSubmitting] = useState(false)

  // Form data
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId, setSelectedBetId] = useState<UserAppId | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
  const [selectedPhone, setSelectedPhone] = useState<UserPhone | null>(null)
  const [amount, setAmount] = useState(0)

  // Confirmation dialog
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Transaction link modal
  const [isTransactionLinkModalOpen, setIsTransactionLinkModalOpen] = useState(false)
  const [transactionLink, setTransactionLink] = useState<string | null>(null)
  const [isMoovUssdModalOpen, setIsMoovUssdModalOpen] = useState(false)
  const [moovUssdCode, setMoovUssdCode] = useState<string | null>(null)
  const [moovMerchantPhone, setMoovMerchantPhone] = useState<string | null>(null)
  const [isOrangeUssdModalOpen, setIsOrangeUssdModalOpen] = useState(false)
  const [orangeUssdCode, setOrangeUssdCode] = useState<string | null>(null)
  const [orangeMerchantPhone, setOrangeMerchantPhone] = useState<string | null>(null)

  // Redirect if not authenticated
  if (!user) {
    router.push("/login")
    return null
  }

  // ── Check pending transaction on mount ───────────────────────────────────
  useEffect(() => {
    const checkPendingTransaction = async () => {
      try {
        const lastTrans = await transactionApi.getLastTransaction()
        if (lastTrans && lastTrans.status === "pending" && lastTrans.type_trans === "deposit") {
          setPendingTransaction(lastTrans)
          setIsPendingDialogOpen(true)
        }
      } catch (error: any) {
        // 404 = aucune transaction, c'est normal
        if (error?.response?.status !== 404) {
          console.error("Erreur vérification transaction en attente:", error)
        }
      } finally {
        setIsPendingCheckDone(true)
      }
    }
    checkPendingTransaction()
  }, [])

  // ── Handlers pending dialog ───────────────────────────────────────────────

  // "Nouveau dépôt" → annule l'ancienne, ferme le dialog, reste sur step 1
  const handleCancelPendingAndContinue = async (reference: string) => {
    try {
      await transactionApi.cancelTransaction(reference)
      toast.success("Ancienne transaction annulée")
      setIsPendingDialogOpen(false)
      setPendingTransaction(null)
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        "Erreur lors de l'annulation de la transaction"
      toast.error(errorMessage)
      throw error
    }
  }

  // "Finaliser" → finalise l'ancienne, enchaîne le flux post-finalisation
  const handleFinalizePending = async (reference: string) => {
    try {
      const finalizedData = await transactionApi.finalizeTransaction(reference)
      setIsPendingDialogOpen(false)
      setPendingTransaction(null)
      await handlePostFinalization(finalizedData)
    } catch (error) {
      throw error
    }
  }

  // ── Flux partagé post-finalisation / post-création ────────────────────────
  const handlePostFinalization = async (data: any) => {
    if (data?.transaction_link) {
      setTransactionLink(data.transaction_link)
      setIsTransactionLinkModalOpen(true)
      return
    }

    // Orange
    if (
      selectedNetwork?.name?.toLowerCase() === "orange" &&
      selectedNetwork.deposit_api?.toLowerCase() === "connect"
    ) {
      if (selectedNetwork.payment_by_link === false) {
        const handled = await handleOrangeUssdFlow(amount)
        if (!handled) router.push("/dashboard")
      } else {
        router.push("/dashboard")
      }
      return
    }

    // Moov ou autre
    const handled = await handleMoovUssdFlow(amount)
    if (!handled) router.push("/dashboard")
  }

  // ─────────────────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      setIsConfirmationOpen(true)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const attemptDialerRedirect = (ussdCode: string) => {
    try {
      const link = document.createElement("a")
      link.href = `tel:${ussdCode}`
      link.style.display = "none"
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
      }, 100)
    } catch (error) {
      console.error("Impossible d'ouvrir automatiquement le composeur:", error)
    }
  }

  const handleMoovUssdFlow = async (amountValue: number) => {
    if (!selectedNetwork || selectedNetwork.name?.toLowerCase() !== "moov") {
      return false
    }
    if (!selectedNetwork.deposit_api || selectedNetwork.deposit_api.toLowerCase() !== "connect") {
      return false
    }
    try {
      const settings = await settingsApi.get()
      const moovPhone = settings.moov_merchant_phone || settings.moov_marchand_phone
      if (!moovPhone) return false

      const ussdAmount = Math.max(1, Math.floor(amountValue * 0.99))
      const ussdCode = `*155*2*1*${moovPhone}*${ussdAmount}#`
      setMoovMerchantPhone(moovPhone)
      setMoovUssdCode(ussdCode)
      setIsMoovUssdModalOpen(true)
      attemptDialerRedirect(ussdCode)
      return true
    } catch (error) {
      console.error("Erreur lors de la récupération des paramètres Moov:", error)
      return false
    }
  }

  const handleOrangeUssdFlow = async (amountValue: number) => {
    if (!selectedNetwork || selectedNetwork.name?.toLowerCase() !== "orange") {
      return false
    }
    if (!selectedNetwork.deposit_api || selectedNetwork.deposit_api.toLowerCase() !== "connect") {
      return false
    }
    try {
      const settings = await settingsApi.get()
      const orangePhone = settings.orange_merchant_phone || settings.orange_marchand_phone
      if (!orangePhone) return false

      const ussdAmount = Math.max(1, Math.floor(amountValue))
      const ussdCode = `*144*2*1*${orangePhone}*${ussdAmount}#`
      setOrangeMerchantPhone(orangePhone)
      setOrangeUssdCode(ussdCode)
      setIsOrangeUssdModalOpen(true)
      attemptDialerRedirect(ussdCode)
      return true
    } catch (error) {
      console.error("Erreur lors de la récupération des paramètres Orange:", error)
      return false
    }
  }

  const handleCopyUssdCode = async () => {
    if (!moovUssdCode) return
    try {
      await navigator.clipboard.writeText(moovUssdCode)
      toast.success("Code USSD copié")
    } catch (error) {
      toast.error("Copie impossible, copiez manuellement le code.")
    }
  }

  const handleCopyOrangeUssdCode = async () => {
    if (!orangeUssdCode) return
    try {
      await navigator.clipboard.writeText(orangeUssdCode)
      toast.success("Code USSD copié")
    } catch (error) {
      toast.error("Copie impossible, copiez manuellement le code.")
    }
  }

  // ── Moov modal close → toujours rediriger vers dashboard ─────────────────
  const handleMoovModalClose = (open: boolean) => {
    if (!open) {
      setIsMoovUssdModalOpen(false)
      router.push("/dashboard")
    } else {
      setIsMoovUssdModalOpen(true)
    }
  }

  // ── Orange modal close → toujours rediriger vers dashboard ───────────────
  const handleOrangeModalClose = (open: boolean) => {
    if (!open) {
      setIsOrangeUssdModalOpen(false)
      router.push("/dashboard")
    } else {
      setIsOrangeUssdModalOpen(true)
    }
  }

  // ── Confirmation de la nouvelle transaction ───────────────────────────────
  // Plus de dialog de résumé post-création : on va directement au flux post-finalisation
  const handleConfirmTransaction = async () => {
    if (!selectedPlatform || !selectedBetId || !selectedNetwork || !selectedPhone) {
      toast.error("Données manquantes pour la transaction")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await transactionApi.createDeposit({
        amount,
        phone_number: selectedPhone.phone,
        app: selectedPlatform.id,
        user_app_id: selectedBetId.user_app_id,
        network: selectedNetwork.id,
        source: "web",
      })

      setIsConfirmationOpen(false)
      toast.success("Dépôt initié avec succès!")
      await handlePostFinalization(response)
    } catch (error: any) {
      const timeErrorMessage = extractTimeErrorMessage(error)
      if (timeErrorMessage) {
        toast.error(timeErrorMessage)
      } else {
        toast.error("Erreur lors de la création du dépôt")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinueTransaction = async () => {
    if (transactionLink) {
      window.open(transactionLink, "_blank", "noopener,noreferrer")
      setIsTransactionLinkModalOpen(false)
      setTransactionLink(null)
      router.push("/dashboard")
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return selectedPlatform !== null
      case 2: return selectedBetId !== null
      case 3: return selectedNetwork !== null
      case 4: return selectedPhone !== null
      case 5:
        return amount > 0 && selectedPlatform &&
          amount >= selectedPlatform.minimun_deposit &&
          amount <= selectedPlatform.max_deposit
      default: return false
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PlatformStep
            selectedPlatform={selectedPlatform}
            onSelect={setSelectedPlatform}
            onNext={handleNext}
            type="deposit"
          />
        )
      case 2:
        return (
          <BetIdStep
            selectedPlatform={selectedPlatform}
            selectedBetId={selectedBetId}
            onSelect={setSelectedBetId}
            onNext={handleNext}
          />
        )
      case 3:
        return (
          <NetworkStep
            selectedNetwork={selectedNetwork}
            onSelect={setSelectedNetwork}
            onNext={handleNext}
            type="deposit"
          />
        )
      case 4:
        return (
          <PhoneStep
            selectedNetwork={selectedNetwork}
            selectedPhone={selectedPhone}
            onSelect={setSelectedPhone}
            onNext={handleNext}
          />
        )
      case 5:
        return (
          <AmountStep
            amount={amount}
            setAmount={setAmount}
            withdriwalCode=""
            setWithdriwalCode={() => {}}
            selectedPlatform={selectedPlatform}
            selectedBetId={selectedBetId}
            selectedNetwork={selectedNetwork}
            selectedPhone={selectedPhone}
            type="deposit"
            onNext={handleNext}
          />
        )
      default:
        return null
    }
  }

  // ── Spinner pendant le check initial ─────────────────────────────────────
  if (!isPendingCheckDone) {
    return (
      <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm">Vérification en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-3 sm:px-4">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Effectuer un dépôt</h1>
        </div>

        {/* Progress Bar */}
        <TransactionProgressBar
          currentStep={currentStep}
          totalSteps={totalSteps}
          type="deposit"
        />

        {/* Current Step */}
        <div className="min-h-[250px] sm:min-h-[300px] lg:min-h-[400px] overflow-x-hidden">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        {currentStep > 1 && currentStep <= 5 && (
          <div className="flex justify-start pt-4 sm:pt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="flex items-center gap-2 w-full sm:w-auto h-11 sm:h-10"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm sm:text-base">Précédent</span>
            </Button>
          </div>
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
          onConfirm={handleConfirmTransaction}
          transactionData={{
            amount,
            phone_number: selectedPhone?.phone || "",
            app: selectedPlatform?.id || "",
            user_app_id: selectedBetId?.user_app_id || "",
            network: selectedNetwork?.id || 0,
          }}
          type="deposit"
          platformName={selectedPlatform?.name || ""}
          networkName={selectedNetwork?.public_name || ""}
          isLoading={isSubmitting}
        />

        {/* Transaction Link Modal */}
        <Dialog open={isTransactionLinkModalOpen} onOpenChange={setIsTransactionLinkModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Continuer la transaction</DialogTitle>
              <DialogDescription>
                Cliquez sur continuer pour continuer la transaction
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsTransactionLinkModalOpen(false)
                  setTransactionLink(null)
                  router.push("/dashboard")
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleContinueTransaction}>
                Continuer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Moov USSD fallback modal */}
        <Dialog open={isMoovUssdModalOpen} onOpenChange={handleMoovModalClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finaliser la transaction Moov</DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Nous n&apos;avons pas pu ouvrir automatiquement le composeur téléphonique. Copiez le code ci-dessous et collez-le dans l&apos;application Téléphone pour terminer votre transaction Moov.
                  </p>
                  {moovMerchantPhone && (
                    <p>
                      <span className="font-semibold text-foreground">Numéro marchand&nbsp;:</span> {moovMerchantPhone}
                    </p>
                  )}
                  {moovUssdCode ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">Code USSD à composer :</p>
                      <div className="flex items-center gap-2">
                        <Input value={moovUssdCode} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="icon" onClick={handleCopyUssdCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Collez ce code dans votre composeur téléphonique et validez pour poursuivre.
                      </p>
                    </div>
                  ) : (
                    <p className="text-destructive text-sm">
                      Impossible de générer le code USSD automatiquement. Veuillez réessayer ou contacter le support.
                    </p>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              {/* ✅ "J'ai compris" redirige vers dashboard */}
              <Button onClick={() => handleMoovModalClose(false)}>J&apos;ai compris</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Orange USSD fallback modal */}
        <Dialog open={isOrangeUssdModalOpen} onOpenChange={handleOrangeModalClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finaliser la transaction Orange</DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Nous n&apos;avons pas pu ouvrir automatiquement le composeur téléphonique. Copiez le code ci-dessous et collez-le dans l&apos;application Téléphone pour terminer votre transaction Orange.
                  </p>
                  {orangeMerchantPhone && (
                    <p>
                      <span className="font-semibold text-foreground">Numéro marchand&nbsp;:</span> {orangeMerchantPhone}
                    </p>
                  )}
                  {orangeUssdCode ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">Code USSD à composer :</p>
                      <div className="flex items-center gap-2">
                        <Input value={orangeUssdCode} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="icon" onClick={handleCopyOrangeUssdCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Collez ce code dans votre composeur téléphonique et validez pour poursuivre.
                      </p>
                    </div>
                  ) : (
                    <p className="text-destructive text-sm">
                      Impossible de générer le code USSD automatiquement. Veuillez réessayer ou contacter le support.
                    </p>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              {/* ✅ "J'ai compris" redirige vers dashboard */}
              <Button onClick={() => handleOrangeModalClose(false)}>J&apos;ai compris</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Pending transaction dialog (au chargement) ── */}
        <TransactionSummaryDialog
          isOpen={isPendingDialogOpen}
          onClose={() => {}} // bloqué — l'utilisateur doit choisir
          transaction={pendingTransaction}
          onCancel={handleCancelPendingAndContinue}
          onFinalize={handleFinalizePending}
          isLoading={isPendingSubmitting}
          mode="pending"
        />
      </div>
    </div>
  )
}