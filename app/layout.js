import './globals.css'

export const metadata = {
  title: 'Finance Tracker',
  description: 'A simple finance tracker app',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
