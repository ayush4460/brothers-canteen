'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { subscribeToPush, unsubscribeFromPush } from '@/actions/push'
import { toast } from 'sonner'

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationManager({ className }: { className?: string }) {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      const sub = await registration.pushManager.getSubscription()
      setSubscription(sub)
    } catch (error) {
      console.error('Service worker registration failed:', error)
    }
  }

  async function subscribeToNotifications() {
    setIsLoading(true)
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      console.log("VAPID KEY IS:", vapidKey)
      
      if (!vapidKey) {
        toast.error("VAPID Key is missing! Please restart your dev server.")
        setIsLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey),
      })
      
      setSubscription(sub)
      
      const serializedSub = JSON.parse(JSON.stringify(sub))
      const res = await subscribeToPush(serializedSub)
      if (res.success) {
        toast.success('Notifications enabled!')
      } else {
        toast.error('Failed to save subscription.')
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast.error('Notification permission was denied.')
      } else {
        toast.error('Failed to enable notifications.')
        console.error(error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function unsubscribe() {
    setIsLoading(true)
    try {
      if (subscription) {
        await subscription.unsubscribe()
        await unsubscribeFromPush(subscription.endpoint)
        setSubscription(null)
        toast.success('Notifications disabled.')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to disable notifications.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <button 
        onClick={() => toast.error('To enable notifications on iPhone, please tap Share -> "Add to Home Screen" first.')}
        className={`p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 rounded-full transition-colors ${className}`}
        title="Notifications not supported in this browser"
      >
        <BellOff className="w-5 h-5 opacity-50" />
      </button>
    )
  }

  if (subscription) {
    return (
      <button 
        onClick={unsubscribe} 
        disabled={isLoading}
        className={`p-2 text-emerald-500 hover:bg-zinc-100 rounded-full transition-colors ${className}`}
        title="Disable notifications"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
      </button>
    )
  }

  return (
    <button 
      onClick={subscribeToNotifications} 
      disabled={isLoading}
      className={`p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 rounded-full transition-colors ${className}`}
      title="Enable notifications"
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellOff className="w-5 h-5" />}
    </button>
  )
}
