import type { Metadata } from 'next'
import '../styles/globals.css'
import '../styles/workspace.css'
import { Toaster } from '../components/ui/sonner'
import { GlobalLoadingProvider } from '../components/GlobalLoading'
import { AuthProvider } from '../lib/context/AuthContext'

export const metadata: Metadata = {
  title: 'KIM CRM & Lead Management System — KIM Communications',
  description: 'CRM and Lead Management System by KIM Communications, powered by KIM Technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GlobalLoadingProvider>
            {children}
            <Toaster position="top-right" />
          </GlobalLoadingProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
