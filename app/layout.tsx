import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import { Toaster } from '../components/ui/sonner'
import { GlobalLoadingProvider } from '../components/GlobalLoading'
import { AuthProvider } from '../lib/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        <AuthProvider>
          <GlobalLoadingProvider>
            {children}
            <Toaster />
          </GlobalLoadingProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
