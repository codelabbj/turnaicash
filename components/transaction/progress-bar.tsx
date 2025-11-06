"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  type?: "deposit" | "withdrawal"
  className?: string
}

export function TransactionProgressBar({ currentStep, totalSteps, type, className }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100

  // Use green for deposits, blue for withdrawals
  const progressColor = type === "deposit" ? "bg-green-500" : type === "withdrawal" ? "bg-blue-500" : "bg-primary"

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
        <span>Étape {currentStep} sur {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress 
        value={progress} 
        className="h-1.5 sm:h-2"
        // Apply custom color via style since Tailwind doesn't support dynamic classes
        style={{
          '--progress-background': type === "deposit" ? '#22c55e' : type === "withdrawal" ? '#3b82f6' : undefined
        } as React.CSSProperties}
      />
    </div>
  )
}
