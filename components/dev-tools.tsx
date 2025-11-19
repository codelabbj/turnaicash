"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    __ERUDA_INITIALIZED__?: boolean
  }
}

export function DevTools() {
  useEffect(() => {
    if (typeof window === "undefined" || window.__ERUDA_INITIALIZED__) {
      return
    }

    import("eruda")
      .then((eruda) => {
        const erudaInstance = eruda?.default ?? eruda
        if (erudaInstance && typeof erudaInstance.init === "function") {
          erudaInstance.init()
          window.__ERUDA_INITIALIZED__ = true
        }
      })
      .catch((error) => {
        console.error("Failed to initialize eruda:", error)
      })
  }, [])

  return null
}

