import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Job Fit Analyzer',
  description: 'AI-powered resume analysis and job matching platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </body>
    </html>
  )
}