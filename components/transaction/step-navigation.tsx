"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface StepNavigationProps {
  currentStep: number
  totalSteps: number
  onPrevious: () => void
  onNext: () => void
  isNextDisabled?: boolean
  nextLabel?: string
  previousLabel?: string
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  isNextDisabled = false,
  nextLabel = "Suivant",
  previousLabel = "Précédent"
}: StepNavigationProps) {
  return (
    <div className="flex justify-between pt-6">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 1}
        className="flex items-center gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        {previousLabel}
      </Button>
      
      <Button
        onClick={onNext}
        disabled={isNextDisabled}
        className="flex items-center gap-2"
      >
        {nextLabel}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
