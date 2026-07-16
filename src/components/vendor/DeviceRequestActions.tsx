'use client'

import { approveDeviceRequest, rejectDeviceRequest } from '@/actions/vendor'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function DeviceRequestActions({ requestId }: { requestId: string }) {
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null)
  const router = useRouter()

  const handleApprove = async () => {
    setActionLoading('approve')
    const res = await approveDeviceRequest(requestId)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Device approved!')
      router.refresh()
    }
    setActionLoading(null)
  }

  const handleReject = async () => {
    setActionLoading('reject')
    const res = await rejectDeviceRequest(requestId)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success('Device rejected!')
      router.refresh()
    }
    setActionLoading(null)
  }

  return (
    <div className="flex gap-3 sm:gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
      <button 
        onClick={handleApprove}
        disabled={actionLoading !== null}
        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow-sm"
      >
        {actionLoading === 'approve' ? '...' : 'Approve'}
      </button>
      <button 
        onClick={handleReject}
        disabled={actionLoading !== null}
        className="flex-1 sm:flex-none bg-zinc-200 hover:bg-zinc-300 disabled:opacity-50 text-zinc-900 text-sm font-medium px-4 py-2 rounded-md transition-colors"
      >
        {actionLoading === 'reject' ? '...' : 'Reject'}
      </button>
    </div>
  )
}
