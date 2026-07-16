'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function sendChatMessage(customerId: string, text: string) {
  try {
    const now = BigInt(Date.now())
    const msg = await db.chatMessage.create({
      data: {
        customerId,
        sender: 'VENDOR',
        text,
        createdAt: now
      }
    })

    const globalWithIo = global as typeof globalThis & { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }
    if (globalWithIo.io) {
      globalWithIo.io.to(`customer_${customerId}`).to('vendor_dashboard').emit('new_chat_message', {
        customerId,
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: Number(msg.createdAt)
      })
    }

    revalidatePath('/vendor/chat')
    return { success: true, message: msg }
  } catch (error: unknown) {
    console.error('Send message error:', error)
    return { error: 'Failed to send message' }
  }
}

export async function deletePurchase(purchaseId: string) {
  try {
    await db.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } })
      if (!purchase) throw new Error('Purchase not found')
      
      if (purchase.status === 'CANCELLED') return

      const customer = await tx.customer.findUnique({ where: { id: purchase.customerId } })
      if (!customer) throw new Error('Customer not found')

      // Mark purchase as cancelled
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: 'CANCELLED' }
      })

      // Subtract from customer balance (only the unpaid portion if it was partially paid, but let's assume simple unpaid deletion for chat)
      const amountToDeduct = purchase.amount - purchase.clearedAmount
      await tx.customer.update({
        where: { id: purchase.customerId },
        data: { currentBalance: customer.currentBalance - amountToDeduct }
      })

      // We should ideally nullify ledger entry, but keeping it simple for WhatsApp style deletion
    })

    const globalWithIo = global as typeof globalThis & { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }
    if (globalWithIo.io) {
      const p = await db.purchase.findUnique({ where: { id: purchaseId } })
      if (p) globalWithIo.io.to(`customer_${p.customerId}`).to('vendor_dashboard').emit('purchase_deleted', { customerId: p.customerId, id: purchaseId })
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Delete purchase error:', error)
    return { error: 'Failed to delete purchase' }
  }
}

export async function editPurchaseAmount(purchaseId: string, newAmount: number) {
  try {
    await db.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } })
      if (!purchase) throw new Error('Purchase not found')
      
      const diff = newAmount - purchase.amount
      
      const customer = await tx.customer.findUnique({ where: { id: purchase.customerId } })
      if (!customer) throw new Error('Customer not found')

      await tx.purchase.update({
        where: { id: purchaseId },
        data: { amount: newAmount }
      })

      await tx.customer.update({
        where: { id: purchase.customerId },
        data: { currentBalance: customer.currentBalance + diff }
      })
    })

    const globalWithIo = global as typeof globalThis & { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }
    if (globalWithIo.io) {
      const p = await db.purchase.findUnique({ where: { id: purchaseId } })
      if (p) globalWithIo.io.to(`customer_${p.customerId}`).to('vendor_dashboard').emit('purchase_edited', { customerId: p.customerId, id: purchaseId, newAmount })
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Edit purchase error:', error)
    return { error: 'Failed to edit purchase' }
  }
}

export async function markMessagesAsRead(customerId: string, reader: 'VENDOR' | 'CUSTOMER') {
  try {
    if (reader === 'VENDOR') {
      // Vendor is reading, so mark customer's purchases as read
      await db.purchase.updateMany({
        where: { customerId, read: false },
        data: { read: true }
      })
    } else {
      // Customer is reading, so mark vendor's chat messages and payments as read
      await db.chatMessage.updateMany({
        where: { customerId, read: false },
        data: { read: true }
      })
      await db.payment.updateMany({
        where: { customerId, read: false },
        data: { read: true }
      })
    }

    const globalWithIo = global as typeof globalThis & { io?: { to: (r: string) => { emit: (e: string, d?: unknown) => void } } }
    if (globalWithIo.io) {
      globalWithIo.io.to(`customer_${customerId}`).to('vendor_dashboard').emit('messages_read', { customerId, reader })
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to mark messages as read:', error)
    return { success: false, error: 'Failed to mark messages as read' }
  }
}
