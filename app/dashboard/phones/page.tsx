"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { phoneApi, userAppIdApi, networkApi, platformApi } from "@/lib/api-client"
import type { UserPhone, UserAppId, Network, Platform } from "@/lib/types"
import { toast } from "react-hot-toast"
import { Loader2, Phone, Plus, Trash2, Edit, Smartphone } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatPhoneNumberForDisplay } from "@/lib/utils"

const phoneSchema = z.object({
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  network: z.number().min(1, "Réseau requis"),
})

const appIdSchema = z.object({
  user_app_id: z.string().min(1, "ID de pari requis"),
  app: z.string().min(1, "Plateforme requise"),
})

type PhoneFormData = z.infer<typeof phoneSchema>
type AppIdFormData = z.infer<typeof appIdSchema>

export default function PhonesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [userPhones, setUserPhones] = useState<UserPhone[]>([])
  const [userAppIds, setUserAppIds] = useState<UserAppId[]>([])
  const [networks, setNetworks] = useState<Network[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false)
  const [isAppIdDialogOpen, setIsAppIdDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingPhone, setEditingPhone] = useState<UserPhone | null>(null)
  const [editingAppId, setEditingAppId] = useState<UserAppId | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: "phone" | "appId"; id: number } | null>(null)

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  })

  const appIdForm = useForm<AppIdFormData>({
    resolver: zodResolver(appIdSchema),
  })

  useEffect(() => {
    loadData()
  }, [])

  // Refetch data when the page gains focus to ensure fresh data
  useEffect(() => {
    const handleFocus = () => {
      loadData()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [phonesData, networksData, platformsData] = await Promise.all([
        phoneApi.getAll(),
        networkApi.getAll(),
        platformApi.getAll(),
      ])
      setUserPhones(phonesData)
      setNetworks(networksData)
      setPlatforms(platformsData)

      // Load all app IDs for all platforms
      const allAppIds: UserAppId[] = []
      for (const platform of platformsData) {
        try {
          const appIds = await userAppIdApi.getByPlatform(platform.id.toString())
          allAppIds.push(...appIds)
        } catch (error) {
          console.error(`Failed to load app IDs for platform ${platform.id}:`, error)
        }
      }
      setUserAppIds(allAppIds)
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneSubmit = async (data: PhoneFormData) => {
    setIsSubmitting(true)
    try {
      if (editingPhone) {
        await phoneApi.update(editingPhone.id, data.phone, data.network)
        toast.success("Numéro modifié avec succès!")
      } else {
        await phoneApi.create(data.phone, data.network)
        toast.success("Numéro ajouté avec succès!")
      }
      setIsPhoneDialogOpen(false)
      phoneForm.reset()
      setEditingPhone(null)
      loadData()
    } catch (error) {
      console.error("Phone operation error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAppIdSubmit = async (data: AppIdFormData) => {
    setIsSubmitting(true)
    try {
      if (editingAppId) {
        await userAppIdApi.update(editingAppId.id, data.user_app_id, data.app)
        toast.success("ID de pari modifié avec succès!")
      } else {
        await userAppIdApi.create(data.user_app_id, data.app)
        toast.success("ID de pari ajouté avec succès!")
      }
      setIsAppIdDialogOpen(false)
      appIdForm.reset()
      setEditingAppId(null)
      loadData()
    } catch (error) {
      console.error("App ID operation error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      if (deleteTarget.type === "phone") {
        await phoneApi.delete(deleteTarget.id)
        toast.success("Numéro supprimé avec succès!")
      } else {
        await userAppIdApi.delete(deleteTarget.id)
        toast.success("ID de pari supprimé avec succès!")
      }
      setDeleteTarget(null)
      loadData()
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const openEditPhoneDialog = (phone: UserPhone) => {
    setEditingPhone(phone)
    phoneForm.reset({
      phone: phone.phone,
      network: phone.network,
    })
    setIsPhoneDialogOpen(true)
  }

  const openEditAppIdDialog = (appId: UserAppId) => {
    setEditingAppId(appId)
    appIdForm.reset({
      user_app_id: appId.user_app_id,
      app: appId.app.toString(),
    })
    setIsAppIdDialogOpen(true)
  }

  const closePhoneDialog = () => {
    setIsPhoneDialogOpen(false)
    setEditingPhone(null)
    phoneForm.reset()
  }

  const closeAppIdDialog = () => {
    setIsAppIdDialogOpen(false)
    setEditingAppId(null)
    appIdForm.reset()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Phone className="h-6 w-6 sm:h-8 sm:w-8" />
          Mes numéros et IDs
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Gérez vos numéros de téléphone et IDs de pari</p>
      </div>

      <Tabs defaultValue="phones" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="phones" className="flex-1 sm:flex-initial text-xs sm:text-sm">Numéros</TabsTrigger>
          <TabsTrigger value="appIds" className="flex-1 sm:flex-initial text-xs sm:text-sm">IDs de pari</TabsTrigger>
        </TabsList>

        {/* Phone Numbers Tab */}
        <TabsContent value="phones" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-4 sm:p-6">
              <div>
                <CardTitle className="text-base sm:text-lg">Numéros de téléphone</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Gérez vos numéros de téléphone mobile</CardDescription>
              </div>
              <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPhone(null)} size="sm" className="w-full sm:w-auto h-9 sm:h-10">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un numéro
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">{editingPhone ? "Modifier le numéro" : "Ajouter un numéro"}</DialogTitle>
                    <DialogDescription className="text-sm">
                      {editingPhone
                        ? "Modifiez les informations de votre numéro"
                        : "Ajoutez un nouveau numéro de téléphone"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm sm:text-base">Numéro de téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+225 01 02 03 04 05"
                        {...phoneForm.register("phone")}
                        disabled={isSubmitting}
                        className="h-11 sm:h-10 text-base sm:text-sm"
                      />
                      {phoneForm.formState.errors.phone && (
                        <p className="text-xs sm:text-sm text-destructive">{phoneForm.formState.errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="network" className="text-sm sm:text-base">Réseau mobile</Label>
                      <Select
                        onValueChange={(value) => phoneForm.setValue("network", Number.parseInt(value))}
                        defaultValue={editingPhone?.network.toString()}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                          <SelectValue placeholder="Sélectionnez un réseau" />
                        </SelectTrigger>
                        <SelectContent>
                          {networks.map((network) => (
                            <SelectItem key={network.id} value={network.id.toString()}>
                              {network.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {phoneForm.formState.errors.network && (
                        <p className="text-xs sm:text-sm text-destructive">{phoneForm.formState.errors.network.message}</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closePhoneDialog}
                        className="flex-1 bg-transparent h-11 sm:h-10 text-sm"
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="flex-1 h-11 sm:h-10 text-sm">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : editingPhone ? (
                          "Modifier"
                        ) : (
                          "Ajouter"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : userPhones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun numéro enregistré</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Ajoutez votre premier numéro pour commencer</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-3">
                    {userPhones.map((phone) => (
                      <Card key={phone.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{formatPhoneNumberForDisplay(phone.phone)}</p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {networks.find((n) => n.id === phone.network)?.name || "Inconnu"}
                              </Badge>
                            </div>
                            <div className="flex gap-2 ml-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditPhoneDialog(phone)} className="h-9 w-9">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget({ type: "phone", id: phone.id })}
                                className="h-9 w-9"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {/* Desktop Table View */}
                  <div className="hidden sm:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numéro</TableHead>
                          <TableHead>Réseau</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userPhones.map((phone) => (
                          <TableRow key={phone.id}>
                            <TableCell className="font-medium">{formatPhoneNumberForDisplay(phone.phone)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {networks.find((n) => n.id === phone.network)?.name || "Inconnu"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditPhoneDialog(phone)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget({ type: "phone", id: phone.id })}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* App IDs Tab */}
        <TabsContent value="appIds" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 p-4 sm:p-6">
              <div>
                <CardTitle className="text-base sm:text-lg">IDs de pari</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Gérez vos identifiants de plateformes de pari</CardDescription>
              </div>
              <Dialog open={isAppIdDialogOpen} onOpenChange={setIsAppIdDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingAppId(null)} size="sm" className="w-full sm:w-auto h-9 sm:h-10">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un ID
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">{editingAppId ? "Modifier l'ID" : "Ajouter un ID"}</DialogTitle>
                    <DialogDescription className="text-sm">
                      {editingAppId ? "Modifiez votre ID de pari" : "Ajoutez un nouvel ID de pari"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={appIdForm.handleSubmit(handleAppIdSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="app" className="text-sm sm:text-base">Plateforme de pari</Label>
                      <Select
                        onValueChange={(value) => appIdForm.setValue("app", value)}
                        defaultValue={editingAppId?.app.toString()}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                          <SelectValue placeholder="Sélectionnez une plateforme" />
                        </SelectTrigger>
                        <SelectContent>
                          {platforms.map((platform) => (
                            <SelectItem key={platform.id} value={platform.id.toString()}>
                              {platform.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {appIdForm.formState.errors.app && (
                        <p className="text-xs sm:text-sm text-destructive">{appIdForm.formState.errors.app.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user_app_id" className="text-sm sm:text-base">ID de pari</Label>
                      <Input
                        id="user_app_id"
                        type="text"
                        placeholder="Votre ID sur la plateforme"
                        {...appIdForm.register("user_app_id")}
                        disabled={isSubmitting}
                        className="h-11 sm:h-10 text-base sm:text-sm"
                      />
                      {appIdForm.formState.errors.user_app_id && (
                        <p className="text-xs sm:text-sm text-destructive">{appIdForm.formState.errors.user_app_id.message}</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeAppIdDialog}
                        className="flex-1 bg-transparent h-11 sm:h-10 text-sm"
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="flex-1 h-11 sm:h-10 text-sm">
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : editingAppId ? (
                          "Modifier"
                        ) : (
                          "Ajouter"
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : userAppIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun ID enregistré</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Ajoutez votre premier ID pour commencer</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-3">
                    {userAppIds.map((appId) => (
                      <Card key={appId.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{appId.user_app_id}</p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {platforms.find((p) => p.id === appId.app)?.name || "Inconnu"}
                              </Badge>
                            </div>
                            <div className="flex gap-2 ml-2">
                              <Button variant="ghost" size="icon" onClick={() => openEditAppIdDialog(appId)} className="h-9 w-9">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget({ type: "appId", id: appId.id })}
                                className="h-9 w-9"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {/* Desktop Table View */}
                  <div className="hidden sm:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID de pari</TableHead>
                          <TableHead>Plateforme</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userAppIds.map((appId) => (
                          <TableRow key={appId.id}>
                            <TableCell className="font-medium">{appId.user_app_id}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {platforms.find((p) => p.id === appId.app)?.name || "Inconnu"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditAppIdDialog(appId)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget({ type: "appId", id: appId.id })}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement{" "}
              {deleteTarget?.type === "phone" ? "ce numéro" : "cet ID"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
