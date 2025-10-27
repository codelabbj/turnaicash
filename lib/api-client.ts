import api from "./api"
import type {
  AuthResponse,
  Network,
  UserPhone,
  Platform,
  UserAppId,
  Transaction,
  PaginatedResponse,
  Notification,
  Bonus,
} from "./types"

export const authApi = {
  login: async (email_or_phone: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", {
      email_or_phone,
      password,
    })
    return data
  },

  register: async (userData: {
    first_name: string
    last_name: string
    email: string
    phone: string
    password: string
    re_password: string
  }) => {
    const { data } = await api.post("/auth/registration", userData)
    return data
  },

  refreshToken: async (refresh: string) => {
    const { data } = await api.post("/auth/token/refresh/", { refresh })
    return data
  },
}

export const networkApi = {
  getAll: async () => {
    const { data } = await api.get<Network[]>("/mobcash/network")
    return data
  },
}

export const phoneApi = {
  getAll: async () => {
    const { data } = await api.get<UserPhone[]>("/mobcash/user-phone/")
    return data
  },

  create: async (phone: string, network: number) => {
    const { data } = await api.post<UserPhone>("/mobcash/user-phone/", {
      phone,
      network,
    })
    return data
  },

  update: async (id: number, phone: string, network: number) => {
    const { data } = await api.patch<UserPhone>(`/mobcash/user-phone/${id}/`, {
      phone,
      network,
    })
    return data
  },

  delete: async (id: number) => {
    await api.delete(`/mobcash/user-phone/${id}/`)
  },
}

export const platformApi = {
  getAll: async () => {
    const { data } = await api.get<Platform[]>("/mobcash/plateform")
    return data
  },
}

export const userAppIdApi = {
  getByPlatform: async (bet_app: string) => {
    const { data } = await api.get<UserAppId[]>(`/mobcash/user-app-id?bet_app=${bet_app}`)
    return data
  },

  create: async (user_app_id: string, app: string) => {
    const { data } = await api.post<UserAppId>("/mobcash/user-app-id/", {
      user_app_id,
      app,
    })
    return data
  },

  update: async (id: number, user_app_id: string, app: string) => {
    const { data } = await api.patch<UserAppId>(`/mobcash/user-app-id/${id}/`, {
      user_app_id,
      app,
    })
    return data
  },

  delete: async (id: number) => {
    await api.delete(`/mobcash/user-app-id/${id}/`)
  },
}

export const transactionApi = {
  getHistory: async (params?: {
    page?: number
    page_size?: number
    user?: string
    type_trans?: "deposit" | "withdrawal"
    status?: "pending" | "accept" | "reject" | "timeout"
    source?: string
    network?: number
    search?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
    }
    const { data } = await api.get<PaginatedResponse<Transaction>>(
      `/mobcash/transaction-history?${queryParams.toString()}`,
    )
    return data
  },

  createDeposit: async (depositData: {
    amount: number
    phone_number: string
    app: string
    user_app_id: string
    network: number
    source: string
  }) => {
    const { data } = await api.post<Transaction>("/mobcash/transaction-deposit", depositData)
    return data
  },

  createWithdrawal: async (withdrawalData: {
    amount: number
    phone_number: string
    app: string
    user_app_id: string
    network: number
    withdriwal_code: string
    source: string
  }) => {
    const { data } = await api.post<Transaction>("/mobcash/transaction-withdrawal", withdrawalData)
    return data
  },
}

export const notificationApi = {
  getAll: async (page = 1) => {
    const { data } = await api.get<PaginatedResponse<Notification>>(`/mobcash/notification?page=${page}`)
    return data
  },
}

export const bonusApi = {
  getAll: async (page = 1) => {
    const { data } = await api.get<PaginatedResponse<Bonus>>(`/mobcash/bonus?page=${page}`)
    return data
  },
}
