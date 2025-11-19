'use client'

import Script from "next/script"

export function ErudaLoader() {
  return (
    <Script
      src="https://cdn.jsdelivr.net/npm/eruda"
      strategy="beforeInteractive"
      onLoad={() => {
        if (window.eruda) {
          window.eruda.init()
        }
      }}
    />
  )
}

