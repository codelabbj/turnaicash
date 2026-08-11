"use client"

import { useState, useEffect } from "react"
import React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ArrowDownToLine, ArrowUpFromLine, Wallet, Loader2, ArrowRight, RefreshCw, MessageSquare, Send, Smartphone, Download, Bot, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { transactionApi, advertisementApi, settingsApi } from "@/lib/api-client"
import type { Transaction, Advertisement, Settings } from "@/lib/types"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { formatPhoneNumberForDisplay } from "@/lib/utils"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { SupportChatbot } from "@/components/SupportChatbot"

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true)
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([])
  const [isLoadingAd, setIsLoadingAd] = useState(true)
  const [adImageErrors, setAdImageErrors] = useState<Set<string>>(new Set())
  const [isChatPopoverOpen, setIsChatPopoverOpen] = useState(false)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [isCarouselPaused, setIsCarouselPaused] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const chatbotEnabled = Boolean(settings?.use_chatbot)
  const telegramEnabled = Boolean(settings?.use_telegram)
  const whatsappEnabled = Boolean(settings?.use_whatsapp)
  
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const fetchRecentTransactions = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setIsLoadingTransactions(true)
      else setIsLoadingMore(true)
      
      const data = await transactionApi.getHistory({
        page: pageNum,
        page_size: 10,
      })
      
      if (pageNum === 1) {
        setRecentTransactions(data.results)
      } else {
        setRecentTransactions(prev => [...prev, ...data.results])
      }
      setHasMore(!!data.next)
    } catch (error) {
      console.error("Error fetching recent transactions:", error)
      toast.error("Erreur lors du chargement des transactions récentes")
    } finally {
      setIsLoadingTransactions(false)
      setIsLoadingMore(false)
    }
  }

  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoadingTransactions || isLoadingMore || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchRecentTransactions(nextPage)
    }
  }

  const fetchAdvertisement = async () => {
    try {
      setIsLoadingAd(true)
      const response = await advertisementApi.get()
      // The API returns a paginated response with results array
      if (response && response.results && Array.isArray(response.results)) {
        // Get all advertisements where enable is true and have an image
        const enabledAds = response.results.filter(
          (ad: Advertisement) => ad.enable === true && (ad.image || ad.image_url)
        )
        setAdvertisements(enabledAds)
      } else {
        // Empty or invalid response - show placeholder
        setAdvertisements([])
      }
    } catch (error) {
      console.error("Error fetching advertisement:", error)
      // On error, show placeholder
      setAdvertisements([])
    } finally {
      setIsLoadingAd(false)
    }
  }

  const whatsappUrl = (() => {
    if (!whatsappEnabled) return ""
    const phone = String(settings?.whatsapp_phone || "").replace(/\D/g, "")
    return phone ? `https://wa.me/${phone}` : ""
  })()
  const telegramUrl = (() => {
    if (!telegramEnabled) return ""
    const value = String(settings?.telegram || "").trim()
    if (!value) return ""
    if (value.startsWith("http")) return value
    return `https://t.me/${value.replace(/^@/, "")}`
  })()
  const showContactFab =
    chatbotEnabled || Boolean(whatsappUrl) || Boolean(telegramUrl)

  const fetchSettings = async () => {
    try {
      const settingsData = await settingsApi.get()
      setSettings(settingsData)
    } catch (error) {
      console.error("Error fetching settings:", error)
      setSettings(null)
    }
  }

  useEffect(() => {
    if (user) {
      fetchRecentTransactions()
      fetchAdvertisement()
      fetchSettings()
    }
  }, [user])

  // Refetch data when the page gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        setPage(1)
        fetchRecentTransactions(1)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  const getAdvertisementImageUrl = (ad: Advertisement) => {
    return ad.image_url || ad.image || null
  }

  const getAdvertisementLink = (ad: Advertisement) => {
    return ad.url || ad.link || null
  }

  const handleAdImageError = (adId: string) => {
    setAdImageErrors(prev => new Set(prev).add(adId))
  }

  // Auto-play carousel
  useEffect(() => {
    if (!carouselApi || advertisements.length <= 1 || isCarouselPaused) return

    const interval = setInterval(() => {
      carouselApi.scrollNext()
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [carouselApi, advertisements.length, isCarouselPaused])

  const getStatusBadge = (status: Transaction["status"]) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending:      { variant: "secondary",    label: "En attente" },
      accept:       { variant: "default",      label: "Accepté" },
      init_payment: { variant: "secondary",    label: "En attente" },
      error:        { variant: "destructive",  label: "Erreur" },
      reject:       { variant: "destructive",  label: "Rejeté" },
      timeout:      { variant: "outline",      label: "Expiré" },
      cancel:       { variant: "outline",      label: "Annulé" },   // ✅ ajout
      annuler:      { variant: "outline",      label: "Annulé" },   // ✅ ajout (API retourne parfois "annuler")
    }
  
    const config = statusConfig[status] || { variant: "outline" as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeBadge = (type: Transaction["type_trans"]) => {
    return (
      <Badge variant={type === "deposit" ? "default" : "secondary"}>
        {type === "deposit" ? "Dépôt" : "Retrait"}
      </Badge>
    )
  }

  return (
    <>
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Bienvenue, {user?.first_name} {user?.last_name}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Gérez vos dépôts et retraits en toute simplicité</p>
      </div>

      {/* Mobile App Download */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/20">
                <Smartphone className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Téléchargez l'application mobile</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Accédez à vos services depuis votre téléphone
                </p>
              </div>
            </div>
            <Button
              asChild
              size="sm"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <a
                href="/app-v1.0.5.apk"
                download="TurainCash-v1.0.5.apk"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="text-xs sm:text-sm font-medium">Télécharger</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance card */}
      {/* <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0">
        <CardHeader>
          <CardDescription className="text-primary-foreground/80">Solde disponible</CardDescription>
          <CardTitle className="text-4xl font-bold">
            {user?.balance?.toLocaleString("fr-FR", {
              style: "currency",
              currency: "XOF",
              minimumFractionDigits: 0,
            }) || "0 FCFA"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button asChild variant="secondary" size="sm" className="text-deposit border-deposit hover:bg-green-500/10">
              <Link href="/dashboard/deposit">
                <ArrowDownToLine className="mr-2 h-4 w-4 text-deposit" />
                Déposer
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm" className="text-withdrawal border-withdrawal hover:bg-blue-500/10">
              <Link href="/dashboard/withdrawal">
                <ArrowUpFromLine className="mr-2 h-4 w-4 text-withdrawal" />
                Retirer
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card> */}

      {/* Quick actions */}
      <div>
        {/* <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Actions rapides</h2> */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button asChild size="sm" className="flex-1 sm:flex-initial min-w-[120px] sm:min-w-[140px] h-10 sm:h-9 bg-[#16a34a] hover:bg-[#15803d] text-white">
            <Link href="/dashboard/deposit" className="flex items-center justify-center gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium">Dépôt</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="flex-1 sm:flex-initial min-w-[120px] sm:min-w-[140px] h-10 sm:h-9 bg-[#2563eb] hover:bg-[#1d4ed8] text-white">
            <Link href="/dashboard/withdrawal" className="flex items-center justify-center gap-2">
              <ArrowUpFromLine className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium">Retrait</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Advertisement Section */}
      <div className="w-full space-y-0">
        <Card className="overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 transition-colors p-0 py-0 rounded-b-none">
          <CardContent className="p-0">
            {isLoadingAd ? (
              <div className="relative w-full aspect-[16/9] sm:aspect-[17/9] lg:aspect-[18/9] bg-muted/30 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : advertisements.length > 0 ? (
              <Carousel
                setApi={setCarouselApi}
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
                onTouchStart={() => setIsCarouselPaused(true)}
                onTouchEnd={() => setIsCarouselPaused(false)}
                onMouseEnter={() => setIsCarouselPaused(true)}
                onMouseLeave={() => setIsCarouselPaused(false)}
              >
                <CarouselContent className="-ml-0">
                  {advertisements.map((ad) => {
                    const imageUrl = getAdvertisementImageUrl(ad)
                    const link = getAdvertisementLink(ad)
                    const adId = ad.id?.toString() || ""
                    const hasError = adImageErrors.has(adId)
                    
                    if (!imageUrl || hasError) return null
                    
                    return (
                      <CarouselItem key={adId} className="pl-0">
                        <div className="relative w-full aspect-[16/9] sm:aspect-[17/9] lg:aspect-[18/9] bg-muted/30">
                          <Image
                            src={imageUrl}
                            alt={ad.title || "Publicité"}
                            fill
                            className={link ? "object-cover cursor-pointer" : "object-cover"}
                            style={{ objectFit: 'cover' }}
                            onError={() => handleAdImageError(adId)}
                          />
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 z-10"
                              aria-label={ad.title || "Voir la publicité"}
                            />
                          )}
                        </div>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
              </Carousel>
            ) : (
              <div className="relative w-full aspect-[16/9] sm:aspect-[17/9] lg:aspect-[18/9] bg-muted/30 flex items-center justify-center">
                <div className="text-center p-4">
                  <p className="text-sm sm:text-base text-muted-foreground font-medium">Espace publicitaire</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Publicité</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Channel Banner */}
        <a
          href="https://whatsapp.com/channel/0029VbDSeC9EKyZDxkLlv20o"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1aa34a] text-white px-4 py-2.5 rounded-b-xl transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 bg-white/20 rounded-full shrink-0">
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold leading-none">WhatsApp Channel</p>
              <p className="text-[10px] text-white/80 mt-0.5">Rejoignez notre canal pour les actualités</p>
            </div>
          </div>
          <svg className="h-4 w-4 fill-white/70 group-hover:fill-white group-hover:translate-x-0.5 transition-all shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </a>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">Activité récente</h2>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setPage(1)
                fetchRecentTransactions(1)
              }}
              disabled={isLoadingTransactions}
              className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-3"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingTransactions ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Actualiser</span>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              <Link href="/dashboard/history" className="flex items-center gap-1 sm:gap-2">
                <span className="hidden sm:inline">Voir tout</span>
                <span className="sm:hidden">Tout</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
        
        {isLoadingTransactions ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : recentTransactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">Aucune transaction récente</p>
              <p className="text-sm text-muted-foreground text-center mt-1">Vos transactions apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="space-y-2 sm:space-y-3 h-[320px] overflow-y-auto pr-1 pb-4"
          >
            {recentTransactions.map((transaction) => (
              <Card 
                key={transaction.id} 
                className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
                onClick={() => {
                  sessionStorage.setItem('cached_transaction', JSON.stringify(transaction))
                  router.push(`/dashboard/history/detail?id=${transaction.id}`)
                }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                        transaction.type_trans === "deposit" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-blue-500/10 text-blue-500"
                      }`}>
                        {transaction.type_trans === "deposit" ? (
                          <ArrowDownToLine className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <ArrowUpFromLine className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <h3 className="font-semibold text-sm sm:text-base truncate">#{transaction.reference}</h3>
                          {getTypeBadge(transaction.type_trans)}
                          {getStatusBadge(transaction.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {transaction.app_details?.name || transaction.app} • {formatPhoneNumberForDisplay(transaction.phone_number)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-base sm:text-lg font-semibold">
                        {transaction.amount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "XOF",
                          minimumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(transaction.created_at), "dd MMM à HH:mm", {
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {showContactFab ? (
    <Popover open={isChatPopoverOpen} onOpenChange={(open) => {
      setIsChatPopoverOpen(open)
      if (open) void fetchSettings()
    }}>
      <PopoverTrigger asChild>
        <Button
          className="fixed right-4 bottom-24 sm:bottom-10 sm:right-8 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          aria-label="Ouvrir le chat"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="sr-only">Ouvrir le chat</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-2 mb-2 mr-2" 
        align="end"
        side="top"
      >
        <div className="space-y-1">
          {chatbotEnabled && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                setIsChatPopoverOpen(false)
                setIsChatbotOpen(true)
              }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">Assistant IA</span>
                <span className="text-xs text-muted-foreground">Réponse instantanée</span>
              </div>
            </Button>
          )}
          {whatsappUrl ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                window.open(whatsappUrl, "_blank")
                setIsChatPopoverOpen(false)
              }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366] text-white">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">WhatsApp</span>
                <span className="text-xs text-muted-foreground">Chat sur WhatsApp</span>
              </div>
            </Button>
          ) : null}
          {telegramUrl ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => {
                window.open(telegramUrl, "_blank")
                setIsChatPopoverOpen(false)
              }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white">
                <Send className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">Telegram</span>
                <span className="text-xs text-muted-foreground">Chat sur Telegram</span>
              </div>
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
    ) : null}

    {isChatbotOpen && chatbotEnabled && (
      <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
        <div className="w-full sm:max-w-lg mx-auto flex flex-col bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl h-[min(80vh,640px)] max-h-[calc(100dvh-2rem)]">
          <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
            <div>
              <p className="font-bold text-lg">Assistant IA</p>
              <p className="text-sm text-muted-foreground">Tapez votre message en bas</p>
            </div>
            <button
              type="button"
              onClick={() => setIsChatbotOpen(false)}
              className="w-10 h-10 border border-border rounded-xl flex items-center justify-center"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 px-3 pb-3">
            <SupportChatbot
              hideHeader
              pageKey="dashboard"
              route="/dashboard"
              screenTitle="Dashboard"
            />
          </div>
        </div>
      </div>
    )}
    </>
  )
}
