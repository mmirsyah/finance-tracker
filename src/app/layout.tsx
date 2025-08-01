import '@/styles/globals.css'

export const metadata = {
  title: 'Finance Tracker',
  description: 'Catatan keuangan sederhana',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900 min-h-screen font-sans p-6">
        {children}
      </body>
    </html>
  )
}
