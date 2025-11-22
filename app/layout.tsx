import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
// import { DevTools } from "@/components/dev-tools"
import { Toaster } from "react-hot-toast"
// import { ErudaLoader } from "@/components/eruda-loader"
import { Suspense } from "react"


const inter = Inter({ subsets: ["latin"] })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Turaincash - Gestion de Dépôts et Retraits",
  description: "Plateforme de gestion de transactions pour paris sportifs",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex flex-col">
              <AuthProvider>
                {/* <ErudaLoader /> */}
                <Suspense fallback={null}>
                  {children}
                </Suspense>
                <Toaster position="top-right" />
                {/* <DevTools /> */}
              </AuthProvider>
            </div>
            <footer className="w-full py-4 text-center text-xs sm:text-sm text-muted-foreground border-t bg-background/80">
              Développé par{" "}
              <a
                href="https://wa.me/22947030588"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Code Lab
              </a>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
