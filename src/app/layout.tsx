import '@/styles/globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata = {
  title: 'Finance Tracker',
  description: 'Catatan keuangan sederhana',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  )
}