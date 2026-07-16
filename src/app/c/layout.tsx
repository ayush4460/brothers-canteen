import { Coffee, LogOut } from 'lucide-react'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh flex-col bg-white text-zinc-900 max-w-2xl mx-auto w-full relative sm:border-x sm:border-zinc-200 shadow-2xl">
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {children}
      </main>
    </div>
  )
}
