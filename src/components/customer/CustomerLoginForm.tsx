'use client'

import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useRouter } from 'next/navigation'
import { requestDeviceApproval } from '@/actions/customer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CustomerLoginForm() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'IDLE' | 'SUBMITTING' | 'PENDING' | 'ERROR'>('IDLE')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('SUBMITTING')
    setErrorMsg('')

    // In a real app we'd gather browser/OS info using navigator.userAgent
    // and generate a pseudo deviceId/fingerprint in local storage.
    let deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('deviceId', deviceId)
    }

    const browserInfo = navigator.userAgent

    const res = await requestDeviceApproval({
      phone,
      deviceId,
      browser: browserInfo,
      os: navigator.platform,
      ip: 'Client IP' // Filled by server action
    })

    if (res.error) {
      setStatus('ERROR')
      setErrorMsg(res.error)
    } else if (res.redirect) {
      router.push(res.redirect)
    } else {
      setStatus('PENDING')
    }
  }

  useEffect(() => {
    if (status === 'PENDING') {
      const socket = io()
      const deviceId = localStorage.getItem('deviceId')
      
      if (deviceId) {
        socket.on('connect', () => {
          socket.emit('join_room', `device_${deviceId}`)
        })
        
        socket.emit('join_room', `device_${deviceId}`)
        
        socket.on('device_approval_status', async (data: { status: string }) => {
          if (data.status === 'APPROVED') {
            // Re-trigger the submit logic to finalize login and get the redirect
            const res = await requestDeviceApproval({
              phone,
              deviceId,
              browser: navigator.userAgent,
              os: navigator.platform,
              ip: 'Client IP'
            })
            if (res.redirect) {
              router.push(res.redirect)
            }
          } else if (data.status === 'REJECTED') {
            setStatus('ERROR')
            setErrorMsg('Your request was rejected by the vendor.')
            socket.disconnect()
          }
        })
      }
      
      return () => {
        socket.disconnect()
      }
    }
  }, [status, phone, router])

  if (status === 'PENDING') {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-lg font-medium text-zinc-900">Approval Pending</h3>
        <p className="text-sm text-zinc-400">
          Your request has been sent to the vendor. Please wait for them to approve this device.
        </p>
        <p className="text-xs text-zinc-400 animate-pulse">
          Waiting for approval...
        </p>
        <Button
          variant="outline"
          onClick={() => setStatus('IDLE')}
          className="w-full border-none bg-[#f0f2f5] text-[#41525d] hover:bg-[#e9edef] rounded-full h-11 font-normal"
        >
          Cancel or Try Another Number
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="phone" className="text-[#41525d] font-normal mb-1.5 block">
          Phone Number
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-[#8696a0] font-medium">+91</span>
          </div>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="9876543210"
            required
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            className="w-full h-12 bg-[#f0f2f5] border-none text-[#111b21] placeholder:text-[#8696a0] pl-12 rounded-lg focus-visible:ring-1 focus-visible:ring-[#00a884] focus-visible:ring-offset-0"
          />
        </div>
      </div>

      {status === 'ERROR' && (
        <div className="text-[#ea0038] text-[15px] bg-[#fdecef] p-3 rounded-lg border border-[#facad2] text-center">
          {errorMsg}
        </div>
      )}

      <div>
        <Button
          type="submit"
          disabled={status === 'SUBMITTING'}
          className="w-full h-11 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full font-medium transition-colors"
        >
          {status === 'SUBMITTING' ? 'Requesting...' : 'Request Access'}
        </Button>
      </div>
    </form>
  )
}
