'use client'

import { useState, useEffect } from 'react'
import { editCustomer } from '@/actions/vendor'
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
} from '@/components/ui/dialog'

export default function EditCustomerModal({ 
  open, 
  onOpenChange, 
  customer,
  onSuccess
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: { id: string, name: string, phone: string }
  onSuccess?: (newCustomerData: { name: string, phone: string }) => void
}) {
  const [phone, setPhone] = useState(customer.phone.replace('+91', ''))
  const [name, setName] = useState(customer.name || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setPhone(customer.phone.replace('+91', ''))
      setName(customer.name || '')
      setError('')
    }
  }, [open, customer])

  const isPhoneChanged = phone !== customer.phone.replace('+91', '')

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setPhone(customer.phone.replace('+91', ''))
      setName(customer.name || '')
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await editCustomer(customer.id, { phone, name })

    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      if (onSuccess) onSuccess({ name, phone: `+91${phone}` })
      onOpenChange(false)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-zinc-200/60 shadow-lg text-zinc-900 sm:max-w-[425px] rounded-xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold">Edit Customer</DialogTitle>
          <DialogDescription className="text-zinc-500 mt-1.5">
            Update the customer's details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-sm font-medium text-zinc-700">Full Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g. Rahul Sharma"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-50/50 border-zinc-200/60 text-zinc-900 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all rounded-lg h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone" className="text-sm font-medium text-zinc-700">Phone Number</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-zinc-600 text-sm font-medium">+91</span>
              </div>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="9876543210"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="bg-zinc-50/50 border-zinc-200/60 text-zinc-900 pl-11 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-all rounded-lg h-10"
              />
            </div>
          </div>
          
          {isPhoneChanged && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-rose-800 text-sm font-medium leading-snug">
              <strong>Warning:</strong> You are changing this customer's phone number. This will securely sign them out of all their devices and they will need to request device approval again using their new number.
            </div>
          )}

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
              disabled={loading}
              className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg font-medium"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
