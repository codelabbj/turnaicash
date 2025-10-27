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
    <Card>
      <CardHeader>
        <CardTitle>Choisir une plateforme</CardTitle>
        <CardDescription>
          Sélectionnez la plateforme de paris pour votre transaction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => (
            <Card
              key={platform.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedPlatform?.id === platform.id
                  ? "ring-2 ring-deposit bg-green-500/10"
                  : "hover:bg-muted/50"
              }`}
              onClick={() => onSelect(platform)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <SafeImage
                    src={platform.image}
                    alt={platform.name}
                    className="w-12 h-12 rounded-lg object-cover"
                    fallbackText={platform.name.charAt(0).toUpperCase()}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{platform.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Min: {platform.minimun_deposit.toLocaleString()} FCFA
                      </Badge>
                      <Badge variant="outline" className="text-xs">
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
            <p className="text-muted-foreground">Aucune plateforme disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
