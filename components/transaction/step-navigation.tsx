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
    <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 pt-4 sm:pt-6">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={currentStep === 1}
        className="flex items-center justify-center gap-2 w-full sm:w-auto h-11 sm:h-10 order-2 sm:order-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="text-sm sm:text-base">{previousLabel}</span>
      </Button>
      
      <Button
        onClick={onNext}
        disabled={isNextDisabled}
        className="flex items-center justify-center gap-2 w-full sm:w-auto h-11 sm:h-10 order-1 sm:order-2"
      >
        <span className="text-sm sm:text-base">{nextLabel}</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
