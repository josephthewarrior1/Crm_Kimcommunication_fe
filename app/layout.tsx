import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import { Toaster } from '../components/ui/sonner'
import { GlobalLoadingProvider } from '../components/GlobalLoading'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KIM Project Management System — KIM Communications',
  description: 'Project management systems by KIM Communications, powered by KIM Technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalLoadingProvider>
          {children}
          <Toaster />
        </GlobalLoadingProvider>
      </body>
    </html>
  )
}
