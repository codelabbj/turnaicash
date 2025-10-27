"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { phoneApi } from "@/lib/api-client"
import type { UserPhone, Network } from "@/lib/types"
import { toast } from "react-hot-toast"

interface PhoneStepProps {
  selectedNetwork: Network | null
  selectedPhone: UserPhone | null
  onSelect: (phone: UserPhone) => void
  onNext: () => void
}

export function PhoneStep({ selectedNetwork, selectedPhone, onSelect, onNext }: PhoneStepProps) {
  const [phones, setPhones] = useState<UserPhone[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingPhone, setEditingPhone] = useState<UserPhone | null>(null)
  const [newPhone, setNewPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (selectedNetwork) {
      fetchPhones()
    }
  }, [selectedNetwork])

  const fetchPhones = async () => {
    if (!selectedNetwork) return
    
    setIsLoading(true)
    try {
      const data = await phoneApi.getAll()
      // Filter phones by selected network
      const networkPhones = data.filter(phone => phone.network === selectedNetwork.id)
      setPhones(networkPhones)
    } catch (error) {
      toast.error("Erreur lors du chargement des numéros de téléphone")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPhone = async () => {
    if (!newPhone.trim() || !selectedNetwork) return
    
    setIsSubmitting(true)
    try {
      const newPhoneData = await phoneApi.create(newPhone.trim(), selectedNetwork.id)
      setPhones(prev => [...prev, newPhoneData])
      setNewPhone("")
      setIsAddDialogOpen(false)
      toast.success("Numéro de téléphone ajouté avec succès")
    } catch (error) {
      toast.error("Erreur lors de l'ajout du numéro de téléphone")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditPhone = async () => {
    if (!newPhone.trim() || !editingPhone || !selectedNetwork) return
    
    setIsSubmitting(true)
    try {
      const updatedPhone = await phoneApi.update(
        editingPhone.id,
        newPhone.trim(),
        selectedNetwork.id
      )
      setPhones(prev => prev.map(phone => 
        phone.id === editingPhone.id ? updatedPhone : phone
      ))
      setNewPhone("")
      setEditingPhone(null)
      setIsEditDialogOpen(false)
      toast.success("Numéro de téléphone modifié avec succès")
    } catch (error) {
      toast.error("Erreur lors de la modification du numéro de téléphone")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePhone = async (phone: UserPhone) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce numéro de téléphone ?")) return
    
    try {
      await phoneApi.delete(phone.id)
      setPhones(prev => prev.filter(p => p.id !== phone.id))
      if (selectedPhone?.id === phone.id) {
        onSelect(null as any)
      }
      toast.success("Numéro de téléphone supprimé avec succès")
    } catch (error) {
      toast.error("Erreur lors de la suppression du numéro de téléphone")
    }
  }

  const openEditDialog = (phone: UserPhone) => {
    setEditingPhone(phone)
    setNewPhone(phone.phone)
    setIsEditDialogOpen(true)
  }

  if (!selectedNetwork) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Veuillez d'abord sélectionner un réseau</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Choisir un numéro de téléphone</CardTitle>
          <CardDescription>
            Sélectionnez votre numéro {selectedNetwork.public_name} pour la transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {phones.map((phone) => (
                <Card
                  key={phone.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPhone?.id === phone.id
                      ? "ring-2 ring-deposit bg-green-500/10"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => onSelect(phone)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{phone.phone}</h3>
                        <p className="text-sm text-muted-foreground">
                          Ajouté le {new Date(phone.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(phone)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePhone(phone)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {phones.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Aucun numéro de téléphone trouvé</p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un numéro
                  </Button>
                </div>
              )}
              
              {phones.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un autre numéro
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Phone Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un numéro de téléphone</DialogTitle>
            <DialogDescription>
              Entrez votre numéro {selectedNetwork.public_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input
                id="phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Ex: +225 07 12 34 56 78"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddPhone} disabled={!newPhone.trim() || isSubmitting}>
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

      {/* Edit Phone Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le numéro de téléphone</DialogTitle>
            <DialogDescription>
              Modifiez votre numéro {selectedNetwork.public_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editPhone">Numéro de téléphone</Label>
              <Input
                id="editPhone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Ex: +225 07 12 34 56 78"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEditPhone} disabled={!newPhone.trim() || isSubmitting}>
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
