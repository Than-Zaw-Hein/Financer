import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'My Finance — မင်းရဲ့ဘဏ္ဍာရေး',
  description: 'Personal Finance Management App',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="my" className="h-full antialiased">
      <body className={`${geistSans.variable} min-h-full flex flex-col md:flex-row`}>
        <Sidebar />
        <main className="flex-1 pt-16 md:pt-0 pb-8 px-4 md:px-6 min-h-screen overflow-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
