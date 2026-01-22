export const metadata = {
  title: 'Seçim Takip Sistemi',
  description: 'Anlık katılım takibi',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
