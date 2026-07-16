import { verifySession } from '@/lib/session'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import VendorChatClient from '@/components/vendor/VendorChatClient'

export default async function VendorChatPage() {
  const auth = await verifySession()
  if (!auth.isAuth || !auth.vendor) redirect('/login')

  // Fetch all customers to populate the sidebar
  const customers = await db.customer.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      purchases: { orderBy: { createdAt: 'desc' }, take: 50 },
      payments: { orderBy: { createdAt: 'desc' }, take: 50 },
      chatMessages: { orderBy: { createdAt: 'desc' }, take: 50 },
    }
  })

  // Format the data for the client
  const chatData = customers.map(c => {
    // Combine purchases, payments, and chat messages into a unified timeline
    const combined = [
      ...c.purchases.map(p => ({
        id: p.id,
        type: 'PURCHASE' as const,
        amount: p.amount,
        status: p.status, // PENDING, UNPAID, CANCELLED, etc.
        timestamp: Number(p.createdAt),
        isSelf: false, // from customer
        read: p.read
      })),
      ...c.payments.map(p => ({
        id: p.id,
        type: 'PAYMENT' as const,
        amount: p.amount,
        timestamp: Number(p.createdAt),
        isSelf: true, // recorded by vendor
        read: p.read
      })),
      ...c.chatMessages.map(m => ({
        id: m.id,
        type: 'TEXT' as const,
        text: m.text,
        timestamp: Number(m.createdAt),
        isSelf: m.sender === 'VENDOR',
        read: m.read
      }))
    ].sort((a, b) => a.timestamp - b.timestamp)

    return {
      id: c.id,
      name: c.name || 'Unknown',
      phone: c.phone,
      balance: c.currentBalance,
      messages: combined,
      unreadCount: 0 // Simplification for now
    }
  }).sort((a, b) => {
    const lastA = a.messages.length > 0 ? a.messages[a.messages.length - 1].timestamp : 0
    const lastB = b.messages.length > 0 ? b.messages[b.messages.length - 1].timestamp : 0
    return lastB - lastA
  })

  return (
    <div className="h-full w-full bg-white flex">
      <VendorChatClient initialCustomers={chatData} />
    </div>
  )
}
