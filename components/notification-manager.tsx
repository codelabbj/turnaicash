"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { setupNotifications } from "@/lib/fcm-helper"

export function NotificationManager() {
    const { user, isHydrated } = useAuth()

    useEffect(() => {
        // Only proceed if hydrated and user exists
        if (!isHydrated || !user?.id) return

        const initNotifications = async () => {
            try {
                console.log('[NotificationManager] Auto-initializing notifications for user:', user.id)
                await setupNotifications(user.id)
            } catch (error) {
                console.error('[NotificationManager] Failed to auto-initialize notifications:', error)
            }
        }

        initNotifications()
    }, [user?.id, isHydrated])

    return null
}
