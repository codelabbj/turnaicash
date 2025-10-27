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
      <Card>
        <CardHeader>
          <CardTitle>Choisir votre ID de pari</CardTitle>
          <CardDescription>
            Sélectionnez votre compte de paris pour {selectedPlatform.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {betIds.map((betId) => (
                <Card
                  key={betId.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedBetId?.id === betId.id
                      ? "ring-2 ring-deposit bg-green-500/10"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => onSelect(betId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{betId.user_app_id}</h3>
                        <p className="text-sm text-muted-foreground">
                          Ajouté le {new Date(betId.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(betId)
                          }}
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
                  <p className="text-muted-foreground mb-4">Aucun ID de pari trouvé</p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un ID de pari
                  </Button>
                </div>
              )}
              
              {betIds.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="w-full"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un ID de pari</DialogTitle>
            <DialogDescription>
              Entrez votre ID de compte pour {selectedPlatform.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="betId">ID de pari</Label>
              <Input
                id="betId"
                value={newBetId}
                onChange={(e) => setNewBetId(e.target.value)}
                placeholder="Entrez votre ID de pari"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddBetId} disabled={!newBetId.trim() || isSubmitting}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'ID de pari</DialogTitle>
            <DialogDescription>
              Modifiez votre ID de compte pour {selectedPlatform.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editBetId">ID de pari</Label>
              <Input
                id="editBetId"
                value={newBetId}
                onChange={(e) => setNewBetId(e.target.value)}
                placeholder="Entrez votre ID de pari"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditBetId} disabled={!newBetId.trim() || isSubmitting}>
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
