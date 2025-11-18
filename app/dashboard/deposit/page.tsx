"use client"

import { useState } from "react"
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
import { ChevronLeft } from "lucide-react"
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

  // Redirect if not authenticated
  if (!user) {
    router.push("/login")
    return null
  }

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
        source: "web"
      })
      
      toast.success("Dépôt initié avec succès!")
      
      // Check if transaction_link exists in the response
      if (response.transaction_link) {
        setTransactionLink(response.transaction_link)
        setIsTransactionLinkModalOpen(true)
        setIsConfirmationOpen(false)
      } else {
        // Check if network is Moov and redirect to phone dialer with USSD code
        const isMoovNetwork = selectedNetwork.name?.toLowerCase() === "moov"
        if (isMoovNetwork) {
          try {
            const settings = await settingsApi.get()
            const moovMerchantPhone = settings.moov_merchant_phone || settings.moov_marchand_phone
            if (moovMerchantPhone) {
              // Calculate amount - 1% (99% of amount)
              const ussdAmount = Math.floor(amount * 0.99)
              // Format USSD code: *155*2*1*{merchant_phone}*{amount-1%}#
              const ussdCode = `*155*2*1*${moovMerchantPhone}*${ussdAmount}#`
              // Redirect to phone dialer
              window.location.href = `tel:${ussdCode}`
              // Still navigate to dashboard after a short delay
              setTimeout(() => {
                router.push("/dashboard")
              }, 1000)
            } else {
              router.push("/dashboard")
            }
          } catch (error) {
            console.error("Error fetching settings for Moov USSD:", error)
            router.push("/dashboard")
          }
        } else {
          router.push("/dashboard")
        }
      }
    } catch (error: any) {
      // Check for rate limit error (error_time_message)
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
      
      // Check if network is Moov and redirect to phone dialer with USSD code
      const isMoovNetwork = selectedNetwork?.name?.toLowerCase() === "moov"
      if (isMoovNetwork && selectedNetwork) {
        try {
          const settings = await settingsApi.get()
          const moovMerchantPhone = settings.moov_merchant_phone || settings.moov_marchand_phone
          if (moovMerchantPhone && amount > 0) {
            // Calculate amount - 1% (99% of amount)
            const ussdAmount = Math.floor(amount * 0.99)
            // Format USSD code: *155*2*1*{merchant_phone}*{amount-1%}#
            const ussdCode = `*155*2*1*${moovMerchantPhone}*${ussdAmount}#`
            // Redirect to phone dialer
            window.location.href = `tel:${ussdCode}`
            // Still navigate to dashboard after a short delay
            setTimeout(() => {
              router.push("/dashboard")
            }, 1000)
            return
          }
        } catch (error) {
          console.error("Error fetching settings for Moov USSD:", error)
        }
      }
      
      router.push("/dashboard")
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return selectedPlatform !== null
      case 2:
        return selectedBetId !== null
      case 3:
        return selectedNetwork !== null
      case 4:
        return selectedPhone !== null
      case 5:
        return amount > 0 && selectedPlatform && 
               amount >= selectedPlatform.minimun_deposit && 
               amount <= selectedPlatform.max_deposit
      default:
        return false
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

        {/* Navigation - Show Previous button for steps 2-5 */}
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
              </div>
    </div>
  )
}