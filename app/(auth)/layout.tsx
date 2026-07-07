"use client"

import type React from "react"
import Image from "next/image"
import { useTheme } from "next-themes"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { resolvedTheme } = useTheme()

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="mb-4">
        <Image
          src={resolvedTheme === "dark" ? "/Turaincash-logo2.png" : "/Turaincash-logo.png"}
          alt="TurainCash Logo"
          width={50}
          height={16}
          className="h-auto w-auto max-w-[150px]"
          priority
        />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
