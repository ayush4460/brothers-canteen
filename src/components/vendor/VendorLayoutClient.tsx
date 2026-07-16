'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut, FileText, CreditCard, MessageSquare, Menu, X } from 'lucide-react'

export default function VendorLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/vendor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/vendor/customers', icon: Users, label: 'Customers' },
    { href: '/vendor/chat', icon: MessageSquare, label: 'WhatsApp Web' },
    { href: '/vendor/payments', icon: CreditCard, label: 'Payments' },
    { href: '/vendor/statements', icon: FileText, label: 'Statements' },
  ]

  return (
    <div className="flex h-[100dvh] bg-white text-zinc-900 flex-col md:flex-row overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Brothers Canteen</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded-md transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Brothers Canteen</h1>
          <button 
            className="md:hidden text-zinc-400 hover:text-zinc-900"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
              const Icon = link.icon
              return (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive ? 'bg-emerald-100 text-emerald-700 font-semibold' : 'text-zinc-600 font-medium hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-zinc-200 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 font-medium hover:text-zinc-900 hover:bg-zinc-100 rounded-md cursor-pointer transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-sm text-red-600 font-medium hover:bg-red-50 hover:text-red-700 rounded-md transition-colors">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-zinc-200 bg-zinc-50/50 shrink-0">
          <h2 className="text-lg font-medium truncate capitalize">
            {pathname.split('/').pop() || 'Overview'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-zinc-200 border border-zinc-300 rounded-full flex items-center justify-center text-sm font-medium text-zinc-700 shadow-sm">
              V
            </div>
          </div>
        </header>
        
        <main className={`flex-1 w-full relative ${pathname === '/vendor/chat' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-8'}`}>
          {children}
        </main>
      </div>
      
    </div>
  )
}
