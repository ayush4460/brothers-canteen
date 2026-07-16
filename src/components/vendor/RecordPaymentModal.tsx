'use client'

import { useState } from 'react'
import { addPayment } from '@/actions/ledger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CreditCard } from 'lucide-react'

export default function RecordPaymentModal({ 
  customerId, 
  customerName, 
  pendingBalance,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger
}: { 
  customerId: string
  customerName: string
  pendingBalance: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setAmount('')
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const parsedAmount = parseInt(amount, 10)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.')
      setLoading(false)
      return
    }

    const res = await addPayment(customerId, parsedAmount)

    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      setOpen(false)
      setAmount('')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger render={
          <Button className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm font-medium px-5" />
        }>
          <CreditCard className="h-4 w-4 mr-2" />
          Record Payment
        </DialogTrigger>
      )}
      <DialogContent className="bg-white border-zinc-200/60 shadow-lg text-zinc-900 sm:max-w-[425px] rounded-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold">Record Payment</DialogTitle>
          <DialogDescription className="text-zinc-500 mt-1.5">
            Enter the payment amount received from {customerName}. This will be deducted from their pending balance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-zinc-50/50 border-y border-zinc-100 p-4 text-center">
          <div className="text-sm text-zinc-500 font-medium">Current Outstanding</div>
          <div className="text-3xl font-bold text-red-600 mt-1">₹{pendingBalance}</div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-sm font-medium text-zinc-700">Amount Received (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="e.g. 500"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-zinc-50/50 border-zinc-200/60 text-zinc-900 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all rounded-lg h-12 text-lg font-medium"
            />
          </div>
          
          {error && (
            <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !amount}
              className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium"
            >
              {loading ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
