'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, SendHorizontal, CheckCheck, Search, MoreVertical, Edit2, Trash2, X } from 'lucide-react'
import { io } from 'socket.io-client'
import { sendChatMessage, deletePurchase, editPurchaseAmount, markMessagesAsRead } from '@/actions/chat'
import RecordPaymentModal from './RecordPaymentModal'
import EditCustomerModal from './EditCustomerModal'

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

type CustomerData = {
  id: string
  name: string
  phone: string
  balance: number
  messages: Message[]
  unreadCount: number
}

export default function VendorChatClient({ initialCustomers }: { initialCustomers: CustomerData[] }) {
  const [customers, setCustomers] = useState<CustomerData[]>(initialCustomers)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const isSendingRef = useRef(false)
  const [editingMsg, setEditingMsg] = useState<{ id: string, amount: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setCustomers(initialCustomers)
  }, [initialCustomers])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [router])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  )

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedCustomer?.messages])

  useEffect(() => {
    if (selectedCustomerId) {
      // Clear unread count locally
      setCustomers(prev => prev.map(c => 
        c.id === selectedCustomerId ? { ...c, unreadCount: 0 } : c
      ))
      // Mark as read on server
      markMessagesAsRead(selectedCustomerId, 'VENDOR')
    }
  }, [selectedCustomerId])

  useEffect(() => {
    const socket = io()

    socket.on('connect', () => {
      socket.emit('join_vendor_dashboard')
      router.refresh() // Fetch any messages missed while disconnected
    })

    socket.on('new_purchase', (data: { customerId: string, id: string, amount: number, timestamp: number }) => {
      if (selectedCustomerId === data.customerId) {
        markMessagesAsRead(data.customerId, 'VENDOR')
      }
      
      setCustomers(prev => {
        const cIdx = prev.findIndex(c => c.id === data.customerId)
        if (cIdx === -1) return prev
        const newC = { ...prev[cIdx] }
        newC.messages = [...newC.messages, {
          id: data.id,
          type: 'PURCHASE',
          amount: data.amount,
          status: 'PENDING',
          timestamp: data.timestamp || Date.now(),
          isSelf: false
        }]
        newC.balance += data.amount
        if (selectedCustomerId !== data.customerId) {
          newC.unreadCount += 1
        }

        // Move to top
        const updated = [...prev]
        updated.splice(cIdx, 1)
        return [newC, ...updated]
      })
    })

    socket.on('new_payment', (data: { customerId: string, id: string, amount: number, newBalance: number, timestamp: number }) => {
      setCustomers(prev => {
        const cIdx = prev.findIndex(c => c.id === data.customerId)
        if (cIdx === -1) return prev
        const newC = { ...prev[cIdx] }
        newC.messages = [...newC.messages, {
          id: data.id,
          type: 'PAYMENT',
          amount: data.amount,
          timestamp: data.timestamp || Date.now(),
          isSelf: true
        }]
        newC.balance = data.newBalance

        const updated = [...prev]
        updated.splice(cIdx, 1)
        return [newC, ...updated]
      })
    })

    socket.on('messages_read', (data: { customerId: string, reader: 'VENDOR' | 'CUSTOMER' }) => {
      if (data.reader === 'CUSTOMER') {
        setCustomers(prev => prev.map(c => {
          if (c.id === data.customerId) {
            return {
              ...c,
              messages: c.messages.map(m => m.isSelf ? { ...m, read: true } : m)
            }
          }
          return c
        }))
      }
    })

    socket.on('new_chat_message', (data: { customerId: string, id: string, text: string, sender: string, timestamp: number }) => {
      setCustomers(prev => {
        const cIdx = prev.findIndex(c => c.id === data.customerId)
        if (cIdx === -1) return prev
        const newC = { ...prev[cIdx] }
        if (newC.messages.find(m => m.id === data.id)) return prev;

        newC.messages = [...newC.messages, {
          id: data.id,
          type: 'TEXT',
          text: data.text,
          timestamp: data.timestamp || Date.now(),
          isSelf: data.sender === 'VENDOR'
        }]
        if (selectedCustomerId !== data.customerId && data.sender !== 'VENDOR') {
          newC.unreadCount += 1
        }

        const updated = [...prev]
        updated.splice(cIdx, 1)
        return [newC, ...updated]
      })
    })

    socket.on('purchase_deleted', (data: { customerId: string, id: string }) => {
      setCustomers(prev => prev.map(c => {
        if (c.id === data.customerId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === data.id ? { ...m, status: 'CANCELLED' } : m)
          }
        }
        return c
      }))
    })

    socket.on('purchase_edited', (data: { customerId: string, id: string, newAmount: number }) => {
      setCustomers(prev => prev.map(c => {
        if (c.id === data.customerId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === data.id ? { ...m, amount: data.newAmount } : m)
          }
        }
        return c
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [selectedCustomerId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId || !inputValue.trim() || isSendingRef.current) return

    const text = inputValue.trim()
    setInputValue('')
    setIsSending(true)
    isSendingRef.current = true

    const res = await sendChatMessage(selectedCustomerId, text)
    if (res.success && res.message) {
      const msg = res.message
      setCustomers(prev => prev.map(c => {
        if (c.id === selectedCustomerId) {
          if (c.messages.some(m => m.id === msg.id)) return c;
          return {
            ...c,
            messages: [...c.messages, {
              id: msg.id,
              type: 'TEXT',
              text: msg.text,
              timestamp: Number(msg.createdAt),
              isSelf: true
            }]
          }
        }
        return c
      }))
    }
    setIsSending(false)
    isSendingRef.current = false
  }

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return
    const res = await deletePurchase(purchaseId)
    if (res.success) {
      setCustomers(prev => prev.map(c => {
        if (c.id === selectedCustomerId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === purchaseId ? { ...m, status: 'CANCELLED' } : m)
          }
        }
        return c
      }))
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMsg || !selectedCustomerId) return

    const res = await editPurchaseAmount(editingMsg.id, editingMsg.amount)
    if (res.success) {
      setCustomers(prev => prev.map(c => {
        if (c.id === selectedCustomerId) {
          return {
            ...c,
            messages: c.messages.map(m => m.id === editingMsg.id ? { ...m, amount: editingMsg.amount } : m)
          }
        }
        return c
      }))
      setEditingMsg(null)
    }
  }

  return (
    <div className="flex w-full h-full bg-white overflow-hidden relative">

      {/* LEFT SIDEBAR (List) */}
      <div className={`
        w-full md:w-80 bg-zinc-50 border-r border-zinc-200 flex flex-col shrink-0 absolute md:relative inset-0 z-20 transition-transform duration-300
        ${selectedCustomerId ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
      `}>
        <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-zinc-900">Chats</h2>
        </div>
        <div className="p-2 border-b border-zinc-200 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.map(c => {
            const lastMsg = c.messages[c.messages.length - 1]
            let preview = 'No messages'
            if (lastMsg) {
              if (lastMsg.type === 'TEXT') preview = lastMsg.text || ''
              else if (lastMsg.type === 'PURCHASE') preview = `Purchase: ₹${lastMsg.amount}`
              else if (lastMsg.type === 'PAYMENT') preview = `Payment: ₹${lastMsg.amount}`
            }

            return (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCustomerId(c.id)
                  // clear unread count
                  setCustomers(prev => prev.map(p => p.id === c.id ? { ...p, unreadCount: 0 } : p))
                }}
                className={`flex items-center gap-3 p-3 cursor-pointer border-b border-zinc-200/50 hover:bg-zinc-200/50 transition-colors ${selectedCustomerId === c.id ? 'bg-zinc-200' : ''}`}
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200 shrink-0">
                  <span className="font-bold text-emerald-700">{(c.name || 'U').charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 truncate">{c.name || c.phone}</span>
                    <span className="text-xs text-zinc-400">
                      {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-zinc-400 truncate">{preview}</span>
                    {c.unreadCount > 0 && (
                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {c.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className={`
        flex-1 flex flex-col absolute md:relative inset-0 z-10 bg-zinc-100 transition-transform duration-300 w-full
        ${selectedCustomerId ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {selectedCustomer ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 shrink-0 relative z-20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-900"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200 shrink-0">
                  <span className="font-bold text-emerald-700">{(selectedCustomer.name || 'U').charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-zinc-900 leading-tight truncate">{selectedCustomer.name || 'Unknown'}</h3>
                  <p className="text-xs text-zinc-400 truncate">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-zinc-400 font-medium">
                <span>Balance: <span className="text-emerald-600 font-bold">₹{selectedCustomer.balance}</span></span>

                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="p-2 hover:bg-zinc-200 rounded-full transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-zinc-200 shadow-lg rounded-xl overflow-hidden z-40 py-1">
                        <button
                          onClick={() => { setIsDropdownOpen(false); setIsEditModalOpen(true); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 font-medium transition-colors"
                        >
                          Edit Customer
                        </button>
                        <button
                          onClick={() => { setIsDropdownOpen(false); setIsPaymentModalOpen(true); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 font-medium transition-colors"
                        >
                          Record Payment
                        </button>
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>

            {/* Chat Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2]">
              {selectedCustomer.messages.map(msg => {

                if (msg.type === 'TEXT') {
                  return (
                    <div key={msg.id} className={`flex flex-col w-full mb-1 ${msg.isSelf ? 'items-end' : 'items-start'}`}>
                      <div className={`relative max-w-[75%] rounded-lg shadow-sm px-2.5 py-1.5 ${msg.isSelf ? 'bg-[#d9fdd3] text-zinc-900 mr-2' : 'bg-white text-zinc-900 ml-2 group'}`}>
                        {/* Tail */}
                        {msg.isSelf ? (
                          <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#d9fdd3] border-r-[10px] border-r-transparent border-b-[10px] border-b-transparent"></div>
                        ) : (
                          <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-white border-l-[10px] border-l-transparent border-b-[10px] border-b-transparent"></div>
                        )}

                        <div className="flex items-end gap-3">
                          <p className="text-[15px] leading-snug break-words pt-0.5">{msg.text}</p>
                          <div className={`flex items-center gap-1 shrink-0 mb-[1px] ${msg.isSelf ? 'text-emerald-700/80' : 'text-zinc-400'}`}>
                            <span className="text-[10px] leading-none">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.isSelf && (
                              msg.read 
                                ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                                : <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                // Purchase
                if (msg.type === 'PURCHASE') {
                  const isCancelled = msg.status === 'CANCELLED'
                  return (
                    <div key={msg.id} className="flex flex-col items-start w-full mb-1">
                      <div className={`relative max-w-[75%] rounded-lg shadow-sm px-2.5 py-1.5 ml-2 group ${isCancelled ? 'bg-zinc-50 text-zinc-400' : 'bg-white text-zinc-900'}`}>
                        {/* Tail */}
                        <div className={`absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-l-[10px] border-l-transparent border-b-[10px] border-b-transparent ${isCancelled ? 'border-t-zinc-50' : 'border-t-white'}`}></div>

                        <div className="flex items-end gap-3 min-w-[70px]">
                          <span className="text-[15px] leading-snug pt-0.5">
                            {isCancelled ? <s>₹{msg.amount}</s> : `₹${msg.amount}`}
                          </span>
                          <div className="flex items-center gap-1 shrink-0 mb-[1px] text-zinc-400 ml-auto">
                            <span className="text-[10px] leading-none">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {!isCancelled && (
                          <div className="hidden group-hover:flex items-center gap-1 absolute -right-14 top-1 z-10">
                            <button onClick={() => setEditingMsg({ id: msg.id, amount: msg.amount || 0 })} className="p-1 text-zinc-400 hover:text-zinc-700 bg-white rounded-full shadow-sm border border-zinc-200"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => handleDeletePurchase(msg.id)} className="p-1 text-rose-400 hover:text-rose-600 bg-white rounded-full shadow-sm border border-rose-200"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }

                // Payment
                if (msg.type === 'PAYMENT') {
                  return (
                    <div key={msg.id} className="flex flex-col items-end w-full mb-1">
                      <div className="relative max-w-[75%] bg-[#d9fdd3] text-zinc-900 rounded-lg shadow-sm px-2.5 py-1.5 mr-2">
                        {/* Tail */}
                        <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#d9fdd3] border-r-[10px] border-r-transparent border-b-[10px] border-b-transparent"></div>

                        <div className="flex items-end gap-3">
                          <p className="text-[15px] leading-snug pt-0.5">
                            Payment Done: <span className="font-medium">₹{msg.amount}</span>
                          </p>
                          <div className="flex items-center gap-1 shrink-0 mb-[1px] text-emerald-700/80 ml-auto">
                            <span className="text-[10px] leading-none">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.read 
                              ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                              : <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Edit Modal (Inline Overlay) */}
            {editingMsg && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-xl w-80 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-zinc-900">Edit Purchase Amount</h4>
                    <button onClick={() => setEditingMsg(null)} className="text-zinc-400 hover:text-zinc-700"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleEditSubmit}>
                    <input
                      type="number"
                      value={editingMsg.amount}
                      onChange={e => setEditingMsg({ ...editingMsg, amount: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-zinc-300 rounded-md px-4 py-2 text-zinc-900 mb-4 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-md py-2 font-medium">Save Changes</button>
                  </form>
                </div>
              </div>
            )}

            {/* Chat Input */}
            <div className="px-4 py-3 bg-[#f0f2f5] border-t border-zinc-200 shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message"
                  className="flex-1 bg-white border-none rounded-lg px-4 py-2.5 text-[15px] text-zinc-900 placeholder:text-zinc-500 focus:outline-none shadow-sm"
                />
                <button
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className="w-10 h-10 bg-[#00a884] hover:bg-[#008f6f] disabled:bg-zinc-300 disabled:opacity-50 transition-colors flex items-center justify-center rounded-full shadow-sm shrink-0"
              >
                <SendHorizontal className="w-5 h-5 text-white ml-0.5" />
              </button>
              </form>
            </div>

            {/* Modals triggered from Chat Header */}
            <EditCustomerModal
              open={isEditModalOpen}
              onOpenChange={setIsEditModalOpen}
              customer={{
                id: selectedCustomer.id,
                name: selectedCustomer.name,
                phone: selectedCustomer.phone
              }}
              onSuccess={(newData) => {
                setCustomers(prev => prev.map(c =>
                  c.id === selectedCustomer.id ? { ...c, name: newData.name, phone: newData.phone } : c
                ))
              }}
            />
            <RecordPaymentModal
              open={isPaymentModalOpen}
              onOpenChange={setIsPaymentModalOpen}
              customerId={selectedCustomer.id}
              customerName={selectedCustomer.name || 'Customer'}
              pendingBalance={selectedCustomer.balance}
              hideTrigger
            />

          </>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-zinc-100 text-zinc-400 h-full">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-200">
              <Send className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-lg font-medium text-zinc-400">WhatsApp Web Clone</p>
            <p className="text-sm">Select a customer from the left to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  )
}
