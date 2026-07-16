'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut, FileText, CreditCard, MessageSquare, Menu, X, ShieldCheck } from 'lucide-react'
import { io } from 'socket.io-client'

export default function VendorLayoutClient({ children, pendingApprovalsCount = 0 }: { children: React.ReactNode, pendingApprovalsCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const socket = io()

    socket.emit('join_vendor_dashboard')

    socket.on('new_device_approval', () => {
      router.refresh()
    })

    socket.on('device_approval_handled', () => {
      router.refresh()
    })

    return () => {
      socket.disconnect()
    }
  }, [router])

  const navLinks = [
    { href: '/vendor/dashboard', icon: MessageSquare, label: 'Dashboard' },
    { href: '/vendor/accounts', icon: LayoutDashboard, label: 'Accounts' },
    { href: '/vendor/customers', icon: Users, label: 'Customers' },
    { href: '/vendor/approvals', icon: ShieldCheck, label: 'Approvals' },
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
                    {link.label === 'Approvals' && pendingApprovalsCount > 0 && (
                      <span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {pendingApprovalsCount}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-zinc-200 shrink-0">

          <button className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-sm text-red-600 font-medium hover:bg-red-50 hover:text-red-700 rounded-md transition-colors">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">

        
        <main className={`flex-1 w-full relative ${pathname === '/vendor/dashboard' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-8'}`}>
          {children}
        </main>
      </div>
      
    </div>
  )
}
