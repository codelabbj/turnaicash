"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Platform, UserAppId, Network, UserPhone } from "@/lib/types"

interface AmountStepProps {
  amount: number
  setAmount: (amount: number) => void
  withdriwalCode: string
  setWithdriwalCode: (code: string) => void
  selectedPlatform: Platform | null
  selectedBetId: UserAppId | null
  selectedNetwork: Network | null
  selectedPhone: UserPhone | null
  type: "deposit" | "withdrawal"
  onNext: () => void
}

export function AmountStep({
  amount,
  setAmount,
  withdriwalCode,
  setWithdriwalCode,
  selectedPlatform,
  selectedBetId,
  selectedNetwork,
  selectedPhone,
  type,
  onNext
}: AmountStepProps) {
  const [errors, setErrors] = useState<{ amount?: string; withdriwalCode?: string }>({})

  const validateAmount = (value: number) => {
    if (!selectedPlatform) return "Plateforme non sélectionnée"
    if (value <= 0) return "Le montant doit être supérieur à 0"
    
    const minAmount = type === "deposit" ? selectedPlatform.minimun_deposit : selectedPlatform.minimun_with
    const maxAmount = type === "deposit" ? selectedPlatform.max_deposit : selectedPlatform.max_win
    
    if (value < minAmount) return `Le montant minimum est ${minAmount.toLocaleString()} FCFA`
    if (value > maxAmount) return `Le montant maximum est ${maxAmount.toLocaleString()} FCFA`
    
    return null
  }

  const validateWithdriwalCode = (code: string) => {
    if (type === "withdrawal" && code.length < 4) {
      return "Le code de retrait doit contenir au moins 4 caractères"
    }
    return null
  }

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    setAmount(numValue)
    
    const error = validateAmount(numValue)
    setErrors(prev => ({ ...prev, amount: error || undefined }))
  }

  const handleWithdriwalCodeChange = (value: string) => {
    setWithdriwalCode(value)
    
    const error = validateWithdriwalCode(value)
    setErrors(prev => ({ ...prev, withdriwalCode: error || undefined }))
  }

  const isFormValid = () => {
    const amountError = validateAmount(amount)
    const withdriwalCodeError = type === "withdrawal" ? validateWithdriwalCode(withdriwalCode) : null
    
    return !amountError && !withdriwalCodeError && 
           selectedPlatform && selectedBetId && selectedNetwork && selectedPhone
  }

  if (!selectedPlatform || !selectedBetId || !selectedNetwork || !selectedPhone) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Veuillez compléter les étapes précédentes</p>
        </CardContent>
      </Card>
    )
  }

  const minAmount = type === "deposit" ? selectedPlatform.minimun_deposit : selectedPlatform.minimun_with
  const maxAmount = type === "deposit" ? selectedPlatform.max_deposit : selectedPlatform.max_win

  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Résumé de la transaction</CardTitle>
          <CardDescription>Vérifiez les détails avant de continuer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Type</span>
            <Badge variant={type === "deposit" ? "default" : "secondary"}>
              {type === "deposit" ? "Dépôt" : "Retrait"}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Plateforme</span>
            <span className="font-medium">{selectedPlatform.name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">ID de pari</span>
            <span className="font-medium">{selectedBetId.user_app_id}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Réseau</span>
            <span className="font-medium">{selectedNetwork.public_name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Numéro de téléphone</span>
            <span className="font-medium">{selectedPhone.phone}</span>
          </div>
        </CardContent>
      </Card>

      {/* Amount Input */}
      <Card>
        <CardHeader>
          <CardTitle>Montant de la transaction</CardTitle>
          <CardDescription>
            Entrez le montant en FCFA (entre {minAmount.toLocaleString()} et {maxAmount.toLocaleString()} FCFA)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Montant (FCFA)</Label>
              <Input
                id="amount"
                type="number"
                value={amount || ""}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Entrez le montant"
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && (
                <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>
            
            {amount > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Montant saisi:</p>
                <p className="text-lg font-semibold">
                  {amount.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "XOF",
                    minimumFractionDigits: 0,
                  })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Code (only for withdrawals) */}
      {type === "withdrawal" && (
        <Card>
          <CardHeader>
            <CardTitle>Code de retrait</CardTitle>
            <CardDescription>
              Entrez votre code de retrait (minimum 4 caractères)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="withdriwalCode">Code de retrait</Label>
              <Input
                id="withdriwalCode"
                type="text"
                value={withdriwalCode}
                onChange={(e) => handleWithdriwalCodeChange(e.target.value)}
                placeholder="Entrez votre code de retrait"
                className={errors.withdriwalCode ? "border-red-500" : ""}
              />
              {errors.withdriwalCode && (
                <p className="text-sm text-red-500 mt-1">{errors.withdriwalCode}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={onNext} 
          disabled={!isFormValid()}
          className="min-w-[120px]"
        >
          Continuer
        </Button>
      </div>
    </div>
  )
}
