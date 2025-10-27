"use client"

import { useState } from "react"

interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fallbackText?: string
}

export function SafeImage({ src, alt, className = "", fallbackText }: SafeImageProps) {
  const [hasError, setHasError] = useState(false)
  
  // Check if src is empty or invalid
  if (!src || src.trim() === "" || hasError) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <span className="text-lg font-semibold text-muted-foreground">
          {fallbackText || alt.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }
  
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}
