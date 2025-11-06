"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { userAppIdApi } from "@/lib/api-client"
import type { UserAppId, Platform } from "@/lib/types"
import { toast } from "react-hot-toast"

interface BetIdStepProps {
  selectedPlatform: Platform | null
  selectedBetId: UserAppId | null
  onSelect: (betId: UserAppId) => void
  onNext: () => void
}

export function BetIdStep({ selectedPlatform, selectedBetId, onSelect, onNext }: BetIdStepProps) {
  const [betIds, setBetIds] = useState<UserAppId[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingBetId, setEditingBetId] = useState<UserAppId | null>(null)
  const [newBetId, setNewBetId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (selectedPlatform) {
      fetchBetIds()
    }
  }, [selectedPlatform])

  const fetchBetIds = async () => {
    if (!selectedPlatform) return
    
    setIsLoading(true)
    try {
      const data = await userAppIdApi.getByPlatform(selectedPlatform.id)
      setBetIds(data)
    } catch (error) {
      toast.error("Erreur lors du chargement des IDs de pari")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddBetId = async () => {
    if (!newBetId.trim() || !selectedPlatform) return
    
    setIsSubmitting(true)
    try {
      const newBetIdData = await userAppIdApi.create(newBetId.trim(), selectedPlatform.id)
      setBetIds(prev => [...prev, newBetIdData])
      setNewBetId("")
      setIsAddDialogOpen(false)
      toast.success("ID de pari ajouté avec succès")
      // Auto-select and advance
      onSelect(newBetIdData)
      setTimeout(() => {
        onNext()
      }, 300)
    } catch (error) {
      toast.error("Erreur lors de l'ajout de l'ID de pari")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditBetId = async () => {
    if (!newBetId.trim() || !editingBetId || !selectedPlatform) return
    
    setIsSubmitting(true)
    try {
      const updatedBetId = await userAppIdApi.update(
        editingBetId.id,
        newBetId.trim(),
        selectedPlatform.id
      )
      setBetIds(prev => prev.map(betId => 
        betId.id === editingBetId.id ? updatedBetId : betId
      ))
      setNewBetId("")
      setEditingBetId(null)
      setIsEditDialogOpen(false)
      toast.success("ID de pari modifié avec succès")
    } catch (error) {
      toast.error("Erreur lors de la modification de l'ID de pari")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBetId = async (betId: UserAppId) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet ID de pari ?")) return
    
    try {
      await userAppIdApi.delete(betId.id)
      setBetIds(prev => prev.filter(b => b.id !== betId.id))
      if (selectedBetId?.id === betId.id) {
        onSelect(null as any)
      }
      toast.success("ID de pari supprimé avec succès")
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'ID de pari")
    }
  }

  const openEditDialog = (betId: UserAppId) => {
    setEditingBetId(betId)
    setNewBetId(betId.user_app_id)
    setIsEditDialogOpen(true)
  }

  if (!selectedPlatform) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Veuillez d'abord sélectionner une plateforme</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Choisir votre ID de pari</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {betIds.map((betId) => (
                <Card
                  key={betId.id}
                  className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${
                    selectedBetId?.id === betId.id
                      ? "ring-2 ring-deposit bg-green-500/10"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => {
                    onSelect(betId)
                    // Auto-advance to next step after a short delay
                    setTimeout(() => {
                      onNext()
                    }, 300)
                  }}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base break-all">{betId.user_app_id}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Ajouté le {new Date(betId.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(betId)
                          }}
                          className="h-9 w-9 sm:h-10 sm:w-10 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteBetId(betId)
                          }}
                          className="h-9 w-9 sm:h-10 sm:w-10 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {betIds.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">Aucun ID de pari trouvé</p>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="h-11 sm:h-10 text-sm sm:text-base">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un ID de pari
                  </Button>
                </div>
              )}
              
              {betIds.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="w-full h-11 sm:h-10 text-sm sm:text-base"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un autre ID de pari
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bet ID Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Ajouter un ID de pari</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                id="betId"
                value={newBetId}
                onChange={(e) => setNewBetId(e.target.value)}
                placeholder="Entrez votre ID de pari"
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10 text-sm">
              Annuler
            </Button>
            <Button onClick={handleAddBetId} disabled={!newBetId.trim() || isSubmitting} className="w-full sm:w-auto h-11 sm:h-10 text-sm">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bet ID Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Modifier l'ID de pari</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                id="editBetId"
                value={newBetId}
                onChange={(e) => setNewBetId(e.target.value)}
                placeholder="Entrez votre ID de pari"
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto h-11 sm:h-10 text-sm">
              Annuler
            </Button>
            <Button onClick={handleEditBetId} disabled={!newBetId.trim() || isSubmitting} className="w-full sm:w-auto h-11 sm:h-10 text-sm">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Modification...
                </>
              ) : (
                "Modifier"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
