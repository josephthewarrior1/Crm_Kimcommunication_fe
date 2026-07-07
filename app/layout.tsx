import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import '../styles/globals.css'
import { Toaster } from '../components/ui/sonner'
import { GlobalLoadingProvider } from '../components/GlobalLoading'
import { AuthProvider } from '../lib/context/AuthContext'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

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
      <body className={ibmPlexSans.className}>
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
