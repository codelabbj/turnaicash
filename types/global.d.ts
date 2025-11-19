declare global {
  interface Window {
    eruda?: {
      init: () => void
    }
  }
}

export {}

