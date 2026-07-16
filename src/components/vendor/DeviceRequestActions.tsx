'use client'

import { approveDeviceRequest, rejectDeviceRequest } from '@/actions/vendor'
import { useState } from 'react'

export function DeviceRequestActions({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    setLoading(true)
    await approveDeviceRequest(requestId)
    setLoading(false)
  }

  const handleReject = async () => {
    setLoading(true)
    await rejectDeviceRequest(requestId)
    setLoading(false)
  }

  return (
    <div className="flex gap-3 sm:gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
      <button 
        onClick={handleApprove}
        disabled={loading}
        className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow-sm"
      >
        {loading ? '...' : 'Approve'}
      </button>
      <button 
        onClick={handleReject}
        disabled={loading}
        className="flex-1 sm:flex-none bg-zinc-200 hover:bg-zinc-300 disabled:opacity-50 text-zinc-900 text-sm font-medium px-4 py-2 rounded-md transition-colors"
      >
        {loading ? '...' : 'Reject'}
      </button>
    </div>
  )
}
