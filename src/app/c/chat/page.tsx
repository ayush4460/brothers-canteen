import { verifySession } from '@/lib/session'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import ChatInterface from '@/components/customer/ChatInterface'

export default async function CustomerChatPage() {
  const auth = await verifySession()
  if (!auth.isAuth || !auth.customer) {
    redirect('/c/login')
  }

  const customerId = auth.customer.id

  // Fetch recent purchases and payments to hydrate chat
  const recentPurchases = await db.purchase.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const recentPayments = await db.payment.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const recentTexts = await db.chatMessage.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const combined = [
    ...recentPurchases.map(p => ({
      id: p.id,
      type: 'PURCHASE' as const,
      amount: p.amount,
      status: p.status,
      timestamp: Number(p.createdAt),
      isSelf: true,
      read: p.read,
    })),
    ...recentPayments.map(p => ({
      id: p.id,
      type: 'PAYMENT' as const,
      amount: p.amount,
      status: 'PAID',
      timestamp: Number(p.createdAt),
      isSelf: false,
      read: p.read,
    })),
    ...recentTexts.map(t => ({
      id: t.id,
      type: 'TEXT' as const,
      text: t.text,
      timestamp: Number(t.createdAt),
      isSelf: false,
      read: t.read,
    }))
  ].sort((a, b) => a.timestamp - b.timestamp) // Sort chronological

  return (
    <ChatInterface 
      customerId={customerId} 
      initialBalance={auth.customer.currentBalance}
      initialMessages={combined}
    />
  )
}
