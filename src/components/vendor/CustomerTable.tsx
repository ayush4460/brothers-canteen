'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

type Customer = {
  id: string
  name: string
  phone: string
  currentBalance: number
  totalCollected: number
}

export default function CustomerTable({ customers }: { customers: Customer[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
        <div className="relative w-full sm:w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input 
            placeholder="Search customers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-50/50 border-zinc-200/60 hover:bg-zinc-50 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 h-9 w-full rounded-lg text-sm transition-all"
          />
        </div>
      </div>
      <div className="p-0">
        {/* Mobile View */}
        <div className="grid grid-cols-1 divide-y divide-zinc-100 sm:hidden">
          {filteredCustomers.length === 0 ? (
            <div className="text-center text-zinc-500 py-12 px-4">
              {customers.length === 0 
                ? "No customers found. Add your first customer to get started." 
                : `No customers found matching "${searchTerm}".`}
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              return (
                <Link 
                  href={`/vendor/customers/${c.id}`} 
                  key={c.id}
                  className="p-5 flex flex-col gap-4 active:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-100">
                      {initials}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-zinc-900">{c.name}</span>
                      <span className="text-zinc-500 text-sm mt-0.5">{c.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-zinc-50/80 rounded-xl p-3.5 border border-zinc-100/80">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-zinc-500 font-medium">Pending Balance</span>
                      <span className="font-bold text-red-600 mt-1 text-lg">₹{c.currentBalance}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-zinc-500 font-medium">Total Collected</span>
                      <span className="font-semibold text-emerald-600 mt-1 text-lg">₹{c.totalCollected}</span>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className="text-zinc-500 font-medium py-3 pl-6 h-auto sm:w-[35%] min-w-[150px]">Customer</TableHead>
                <TableHead className="text-zinc-500 font-medium py-3 h-auto sm:w-[25%] min-w-[130px]">Phone</TableHead>
                <TableHead className="text-zinc-500 font-medium py-3 h-auto text-center sm:w-[20%] min-w-[130px]">Pending Balance</TableHead>
                <TableHead className="text-zinc-500 font-medium py-3 pr-6 h-auto text-center hidden sm:table-cell sm:w-[20%]">Total Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-zinc-500 py-12">
                    {customers.length === 0 
                      ? "No customers found. Add your first customer to get started." 
                      : `No customers found matching "${searchTerm}".`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => {
                  const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  return (
                    <TableRow key={c.id} className="border-zinc-100 hover:bg-zinc-50/50 transition-colors group">
                      <TableCell className="py-3 pl-6">
                        <Link href={`/vendor/customers/${c.id}`} className="flex items-center gap-3 w-fit">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <span className="font-semibold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                            {c.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-zinc-500 py-3">{c.phone}</TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600 py-3">₹{c.currentBalance}</TableCell>
                      <TableCell className="text-center text-zinc-500 py-3 pr-6 hidden sm:table-cell">₹{c.totalCollected}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
