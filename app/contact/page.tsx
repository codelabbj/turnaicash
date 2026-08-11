"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { settingsApi } from "@/lib/api-client"
import { SupportChatbot } from "@/components/SupportChatbot"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function ContactPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [chatbotEnabled, setChatbotEnabled] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/login")
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const settings = await settingsApi.get()
        if (!cancelled) setChatbotEnabled(Boolean(settings?.use_chatbot))
      } catch {
        if (!cancelled) setChatbotEnabled(false)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, authLoading, router])

  if (authLoading || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 py-2 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold flex-1">Support</h1>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-3xl w-full mx-auto p-3">
        {chatbotEnabled ? (
          <div className="h-[min(78vh,640px)] rounded-xl border bg-background overflow-hidden">
            <SupportChatbot pageKey="contact" route="/contact" screenTitle="Support" />
          </div>
        ) : (
          <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
            L&apos;assistant IA n&apos;est pas activé pour le moment. Utilisez WhatsApp ou Telegram
            depuis le tableau de bord, ou enregistrez vos numéros dans le profil.
          </div>
        )}
      </main>
    </div>
  )
}
