'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { forceRefreshCustomer } from '@/actions/customer'
import { addPurchase } from '@/actions/ledger'
import { SendHorizontal, Check, CheckCheck, Clock, WifiOff, Coffee, LogOut } from 'lucide-react'
import { io } from 'socket.io-client'
import { markMessagesAsRead } from '@/actions/chat'
import { PushNotificationManager } from '@/components/PushNotificationManager'

type Message = {
  id: string
  type: 'PURCHASE' | 'PAYMENT' | 'TEXT'
  amount?: number
  text?: string
  status?: string
  timestamp: number
  isSelf: boolean
  read?: boolean
}

export default function ChatInterface({ 
  customerId, 
  initialBalance,
  initialMessages 
}: { 
  customerId: string
  initialBalance: number
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [balance, setBalance] = useState(initialBalance)
  const [isSending, setIsSending] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    setMessages(initialMessages)
    setBalance(initialBalance)
  }, [initialMessages, initialBalance])

  useEffect(() => {
    const handleRefresh = () => {
      forceRefreshCustomer().then(() => {
        router.refresh()
        markMessagesAsRead(customerId, 'CUSTOMER')
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh()
      }
    }
    // Vercel Fallback Polling
    const pollInterval = setInterval(() => {
      handleRefresh()
    }, 5000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleRefresh)
    window.addEventListener('online', handleRefresh)

    return () => {
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('online', handleRefresh)
    }
  }, [router, customerId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    // Mark as read when customer focuses chat
    markMessagesAsRead(customerId, 'CUSTOMER')
  }, [customerId])

  useEffect(() => {
    const socket = io()

    socket.on('connect', () => {
      socket.emit('join_customer', customerId)
      forceRefreshCustomer().then(() => router.refresh()) // Fetch any messages missed while disconnected
    })

    socket.on('new_payment', (data: { id: string, amount: number, newBalance: number, timestamp: number }) => {
      markMessagesAsRead(customerId, 'CUSTOMER')
      const newMsg: Message = {
        id: data.id,
        type: 'PAYMENT',
        amount: data.amount,
        status: 'PAID',
        timestamp: data.timestamp,
        isSelf: false
      }
      setMessages(prev => [...prev, newMsg])
      setBalance(data.newBalance)
    })

    socket.on('new_chat_message', (data: { id: string, text: string, timestamp: number }) => {
      markMessagesAsRead(customerId, 'CUSTOMER')
      const newMsg: Message = {
        id: data.id,
        type: 'TEXT',
        text: data.text,
        timestamp: data.timestamp,
        isSelf: false
      }
      setMessages(prev => [...prev, newMsg])
    })

    socket.on('purchase_deleted', (data: { id: string }) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, status: 'CANCELLED' } : m))
      // Balance update ideally synced via separate event or API refetch, but UI handles status
    })

    socket.on('purchase_edited', (data: { id: string, newAmount: number }) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, amount: data.newAmount } : m))
    })

    socket.on('messages_read', (data: { customerId: string, reader: 'VENDOR' | 'CUSTOMER' }) => {
      if (data.reader === 'VENDOR') {
        setMessages(prev => prev.map(m => m.isSelf ? { ...m, read: true } : m))
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [customerId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOnline) return
    
    const amount = parseInt(inputValue, 10)
    if (isNaN(amount) || amount <= 0) return

    setInputValue('')
    setIsSending(true)

    // Optimistic UI update
    const tempId = crypto.randomUUID()
    const newMsg: Message = {
      id: tempId,
      type: 'PURCHASE',
      amount,
      status: 'PENDING',
      timestamp: Date.now(),
      isSelf: true
    }
    setMessages(prev => [...prev, newMsg])

    // Server Action
    const res = await addPurchase(customerId, amount)

    if (res.success) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'UNPAID' } : m))
      setBalance(prev => prev + amount)
    } else {
      // Revert optimistic update on failure (basic)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      alert('Failed to send purchase amount.')
    }
    
    setIsSending(false)
  }

  return (
    <>
      <header className="flex h-14 items-center justify-between px-4 border-b border-zinc-200 bg-white/90 backdrop-blur z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
            <Coffee className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900">Brothers Canteen</h1>
            <p className="text-[10px] text-emerald-500 font-medium tracking-wider uppercase">Open</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <PushNotificationManager />
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-zinc-400 hover:text-zinc-900 p-2 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-red-500 text-zinc-900 text-xs text-center py-1 font-medium flex items-center justify-center gap-2">
          <WifiOff className="h-3 w-3" /> You are offline
        </div>
      )}


      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2]">
        {messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="bg-zinc-50/80 px-4 py-2 rounded-xl text-xs text-zinc-400 border border-zinc-200/50 shadow-sm text-center">
              Send your purchase amount (e.g. 120)<br/>to add it to your ledger.
            </div>
          </div>
        ) : (
          messages.map(msg => {
            if (msg.type === 'TEXT') {
              return (
                <div key={msg.id} className="flex flex-col items-start w-full mb-1">
                  <div className="max-w-[75%] px-3 py-1.5 rounded-lg shadow-sm relative group bg-white">
                    <div className="absolute top-0 -left-2 w-0 h-0 border-[6px] border-transparent border-t-white border-r-white" />
                    <div className="flex items-end gap-3">
                      <p className="text-[15px] leading-snug break-words pt-0.5">{msg.text}</p>
                      <div className="flex items-center gap-1 shrink-0 opacity-70 mb-0.5">
                        <span className="text-[10px] leading-none">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            if (msg.type === 'PAYMENT') {
              return (
                <div key={msg.id} className="flex flex-col items-start w-full mb-1">
                  <div className="max-w-[75%] px-3 py-1.5 rounded-lg shadow-sm relative group bg-white">
                    <div className="absolute top-0 -left-2 w-0 h-0 border-[6px] border-transparent border-t-white border-r-white" />
                    <div className="flex items-end gap-3">
                      <div className="pt-0.5 text-[15px] leading-snug">
                        Payment of <span className="text-emerald-600 font-bold">₹{msg.amount}</span> is successful.
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-70 mb-0.5">
                        <span className="text-[10px] leading-none">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            // PURCHASE
            const isCancelled = msg.status === 'CANCELLED'
            return (
              <div key={msg.id} className="flex flex-col items-end w-full mb-1">
                <div className={`max-w-[75%] px-3 py-1.5 rounded-lg shadow-sm relative group ${
                  isCancelled ? 'bg-zinc-200 text-zinc-600' : 'bg-[#d9fdd3] text-zinc-900'
                }`}>
                  <div className={`absolute top-0 -right-2 w-0 h-0 border-[6px] border-transparent ${isCancelled ? 'border-t-zinc-200 border-l-zinc-200' : 'border-t-[#d9fdd3] border-l-[#d9fdd3]'}`} />
                  
                  <div className="flex items-end gap-3">
                    <span className="text-[15px] font-medium leading-snug pt-0.5">
                      {isCancelled ? <s>₹{msg.amount}</s> : `₹${msg.amount}`}
                    </span>
                    
                    <div className={`flex items-center gap-1 shrink-0 mb-0.5 ${isCancelled ? 'opacity-50' : 'text-zinc-500'}`}>
                      <span className="text-[10px] leading-none">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!isCancelled && (
                        <>
                          {msg.status === 'PENDING' ? (
                            <Clock className="h-[12px] w-[12px]" />
                          ) : (
                            <CheckCheck className={`h-[14px] w-[14px] ${msg.read ? 'text-blue-500' : 'text-zinc-500'}`} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="px-4 py-3 bg-[#f0f2f5] border-t border-zinc-200 shrink-0">
        <div className="flex items-center gap-3">
          <input
            type="number"
            pattern="[0-9]*"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!isOnline}
            placeholder={isOnline ? "Enter amount..." : "Offline"}
            className="flex-1 h-10 bg-white rounded-lg px-4 text-[15px] text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm disabled:opacity-50 disabled:bg-zinc-100"
          />
          <button
            type="submit"
            disabled={!inputValue || isSending || !isOnline}
            className="w-10 h-10 bg-[#00a884] hover:bg-[#008f6f] disabled:bg-zinc-300 disabled:opacity-50 transition-colors flex items-center justify-center rounded-full shadow-sm shrink-0"
          >
            <SendHorizontal className="w-5 h-5 ml-0.5 text-white" />
          </button>
        </div>
      </form>
    </>
  )
}
