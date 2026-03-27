// app/upload/layout.tsx
import Navbar from '@/components/Navbar'

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0e1a]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
