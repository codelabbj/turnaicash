"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SafeImage } from "@/components/ui/safe-image"
import { Loader2, Plus } from "lucide-react"
import { platformApi } from "@/lib/api-client"
import type { Platform } from "@/lib/types"
import { toast } from "react-hot-toast"

interface PlatformStepProps {
  selectedPlatform: Platform | null
  onSelect: (platform: Platform) => void
  onNext: () => void
}

export function PlatformStep({ selectedPlatform, onSelect, onNext }: PlatformStepProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const data = await platformApi.getAll()
        // Filter only enabled platforms
        const enabledPlatforms = data.filter(platform => platform.enable)
        setPlatforms(enabledPlatforms)
      } catch (error) {
        toast.error("Erreur lors du chargement des plateformes")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlatforms()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">Choisir une plateforme</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => (
            <Card
              key={platform.id}
              className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${
                selectedPlatform?.id === platform.id
                  ? "ring-2 ring-deposit bg-green-500/10"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => {
                onSelect(platform)
                // Auto-advance to next step after a short delay
                setTimeout(() => {
                  onNext()
                }, 300)
              }}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <SafeImage
                    src={platform.image}
                    alt={platform.name}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                    fallbackText={platform.name.charAt(0).toUpperCase()}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base truncate">{platform.name}</h3>
                    {(platform.city || platform.street) && (
                      <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                        {platform.city && (
                          <p className="truncate">
                            <span className="font-medium">Ville:</span> {platform.city}
                          </p>
                        )}
                        {platform.street && (
                          <p className="truncate">
                            <span className="font-medium">Rue:</span> {platform.street}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                        Min: {platform.minimun_deposit.toLocaleString()} FCFA
                      </Badge>
                      <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
                        Max: {platform.max_deposit.toLocaleString()} FCFA
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {platforms.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Aucune plateforme disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
