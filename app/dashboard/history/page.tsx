"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Filter, RefreshCw } from "lucide-react"
import { transactionApi } from "@/lib/api-client"
import type { Transaction } from "@/lib/types"
import { toast } from "react-hot-toast"
import { TransactionActivityItem } from "@/components/transaction-activity-item"

export default function TransactionHistoryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const initialLoadDone = useRef(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accept" | "reject" | "timeout">("all")

  useEffect(() => {
    fetchTransactions()
  }, [currentPage, searchTerm, typeFilter, statusFilter])

  useEffect(() => {
    const handleFocus = () => {
      fetchTransactions({ silent: true })
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [currentPage, searchTerm, typeFilter, statusFilter])

  const fetchTransactions = async (opts?: { silent?: boolean; refresh?: boolean }) => {
    const showLoader = !initialLoadDone.current && !opts?.silent
    if (showLoader) setIsLoading(true)
    else if (opts?.refresh) setIsRefreshing(true)
    try {
      const params: any = {
        page: currentPage,
        page_size: 10,
      }
      
      if (searchTerm) params.search = searchTerm
      if (typeFilter !== "all") params.type_trans = typeFilter
      if (statusFilter !== "all") params.status = statusFilter
      
      const data = await transactionApi.getHistory(params)
      setTransactions(data.results)
      setTotalCount(data.count)
      setTotalPages(Math.ceil(data.count / 10))
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique")
    } finally {
      initialLoadDone.current = true
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === "type") {
      setTypeFilter(value as any)
    } else if (filterType === "status") {
      setStatusFilter(value as any)
    }
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setTypeFilter("all")
    setStatusFilter("all")
    setCurrentPage(1)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Veuillez vous connecter pour voir l'historique</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Historique des transactions</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Consultez toutes vos transactions de dépôt et de retrait
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-10 sm:h-9 text-base sm:text-sm"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={(value) => handleFilterChange("type", value)}>
                <SelectTrigger className="h-10 sm:h-9 text-base sm:text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="deposit">Dépôts</SelectItem>
                  <SelectItem value="withdrawal">Retraits</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger className="h-10 sm:h-9 text-base sm:text-sm">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="accept">Accepté</SelectItem>
                  <SelectItem value="reject">Rejeté</SelectItem>
                  <SelectItem value="timeout">Expiré</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={clearFilters} className="h-10 sm:h-9 text-sm">
                Effacer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base sm:text-lg">
              <span>Activité récente ({totalCount})</span>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => fetchTransactions({ refresh: true })}
                className="h-9 w-9 rounded-full self-start sm:self-auto"
                aria-label="Actualiser"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucune transaction trouvée</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vos transactions apparaîtront ici une fois effectuées
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.map((transaction) => (
                  <TransactionActivityItem
                    key={transaction.id}
                    transaction={transaction}
                    onClick={() => {
                      sessionStorage.setItem("cached_transaction", JSON.stringify(transaction))
                      router.push(`/dashboard/history/detail?id=${transaction.id}`)
                    }}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4 sm:mt-6">
                <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                  Page {currentPage} sur {totalPages} ({totalCount} transactions)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-9 text-xs sm:text-sm"
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-9 text-xs sm:text-sm"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}