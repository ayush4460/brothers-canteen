'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createId } from '@paralleldrive/cuid2'

/**
 * Validates that an amount is a positive integer.
 */
function validateAmount(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Amount must be a positive integer.')
  }
}

/**
 * Adds a new purchase for a customer.
 */
export async function addPurchase(customerId: string, amount: number) {
  validateAmount(amount)
  
  try {
    const now = BigInt(Date.now())
    const purchaseId = createId()
    const ledgerEntryId = createId()
    const timelineEventId = createId()

    await db.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } })
      if (!customer) throw new Error('Customer not found')

      const newBalance = customer.currentBalance + amount

      // 1. Create Purchase
      await tx.purchase.create({
        data: {
          id: purchaseId,
          customerId,
          amount,
          clearedAmount: 0,
          status: 'UNPAID',
          createdAt: now,
          updatedAt: now,
        }
      })

      // 2. Create Ledger Entry
      await tx.ledgerEntry.create({
        data: {
          id: ledgerEntryId,
          customerId,
          referenceType: 'PURCHASE',
          type: 'DEBIT',
          amount,
          // balanceAfter is not in the schema for LedgerEntry! Wait, let's remove it if it's missing. Let me double check if balanceAfter is in schema...
          referenceId: purchaseId,
          createdAt: now,
        }
      })

      // 3. Create Timeline Event
      await tx.timelineEvent.create({
        data: {
          id: timelineEventId,
          customerId,
          entityType: 'PURCHASE',
          entityId: purchaseId,
          sequenceNumber: Math.floor(Date.now() / 1000), // Store as Int
          createdAt: now,
        }
      })

      // 4. Update Customer Balance
      await tx.customer.update({
        where: { id: customerId },
        data: { currentBalance: newBalance, updatedAt: now }
      })
    })

    revalidatePath(`/vendor/customers`)
    revalidatePath(`/vendor/dashboard`)

    const globalWithIo = global as typeof globalThis & { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }
    if (globalWithIo.io) {
      globalWithIo.io.to(`customer_${customerId}`).to('vendor_dashboard').emit('new_purchase', {
        customerId,
        id: purchaseId,
        amount,
        timestamp: Number(now)
      })
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Add purchase error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to add purchase' }
  }
}

/**
 * Adds a payment and performs FIFO allocation.
 */
export async function addPayment(customerId: string, amount: number) {
  validateAmount(amount)
  
  try {
    const now = BigInt(Date.now())
    const paymentId = createId()
    const ledgerEntryId = createId()
    const timelineEventId = createId()
    let newBalance = 0

    await db.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } })
      if (!customer) throw new Error('Customer not found')

      // 1. Create Payment
      await tx.payment.create({
        data: {
          id: paymentId,
          customerId,
          amount,
          unallocatedAmount: amount, // Start with full amount to allocate
          status: 'UNALLOCATED',
          paymentDate: now,
          createdAt: now,
          updatedAt: now,
        }
      })

      // 2. FIFO Allocation
      // Find all unpaid or partially paid purchases, ordered by oldest first
      const pendingPurchases = await tx.purchase.findMany({
        where: {
          customerId,
          status: { in: ['UNPAID', 'PARTIALLY_PAID'] }
        },
        orderBy: { createdAt: 'asc' }
      })

      let remainingPayment = amount

      for (const purchase of pendingPurchases) {
        if (remainingPayment <= 0) break

        const purchasePendingAmount = purchase.amount - purchase.clearedAmount
        const allocationAmount = Math.min(remainingPayment, purchasePendingAmount)

        // Create PaymentAllocation
        await tx.paymentAllocation.create({
          data: {
            id: createId(),
            paymentId,
            purchaseId: purchase.id,
            allocatedAmount: allocationAmount,
            createdAt: now,
          }
        })

        // Update Purchase
        const newClearedAmount = purchase.clearedAmount + allocationAmount
        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            clearedAmount: newClearedAmount,
            status: newClearedAmount >= purchase.amount ? 'PAID' : 'PARTIALLY_PAID',
            updatedAt: now,
          }
        })

        remainingPayment -= allocationAmount
      }

      // Update Payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          unallocatedAmount: remainingPayment,
          status: remainingPayment === 0 ? 'ALLOCATED' : (remainingPayment < amount ? 'PARTIALLY_ALLOCATED' : 'UNALLOCATED'),
          updatedAt: now,
        }
      })

      // 3. Create Ledger Entry
      await tx.ledgerEntry.create({
        data: {
          id: ledgerEntryId,
          customerId,
          referenceType: 'PAYMENT',
          type: 'CREDIT',
          amount,
          referenceId: paymentId,
          createdAt: now,
        }
      })

      // 4. Create Timeline Event
      await tx.timelineEvent.create({
        data: {
          id: timelineEventId,
          customerId,
          entityType: 'PAYMENT',
          entityId: paymentId,
          sequenceNumber: Math.floor(Date.now() / 1000),
          createdAt: now,
        }
      })

      // 5. Update Customer Balance
      newBalance = customer.currentBalance - amount
      await tx.customer.update({
        where: { id: customerId },
        data: { 
          currentBalance: newBalance, 
          totalCollected: customer.totalCollected + amount,
          updatedAt: now 
        }
      })
    })

    revalidatePath(`/vendor/customers`)
    revalidatePath(`/vendor/dashboard`)

    const globalWithIo = global as typeof globalThis & { io?: { to: (r: string) => { emit: (e: string, d: unknown) => void } } }
    if (globalWithIo.io) {
      globalWithIo.io.to(`customer_${customerId}`).to('vendor_dashboard').emit('new_payment', { 
        customerId,
        id: paymentId,
        amount, 
        newBalance,
        timestamp: Number(now)
      })
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Add payment error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to add payment' }
  }
}

/**
 * Adds a correction to a purchase.
 */
export async function addCorrection(customerId: string, correctsPurchaseId: string, amount: number, reason: string) {
  try {
    const now = BigInt(Date.now())
    const correctionId = createId()
    const ledgerEntryId = createId()
    const timelineEventId = createId()

    await db.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } })
      if (!customer) throw new Error('Customer not found')

      const purchase = await tx.purchase.findUnique({ where: { id: correctsPurchaseId } })
      if (!purchase) throw new Error('Purchase not found')

      const newBalance = customer.currentBalance + amount // amount can be negative or positive

      // 1. Create Correction
      await tx.correction.create({
        data: {
          id: correctionId,
          customerId,
          correctsPurchaseId,
          amount,
          reason,
          createdAt: now,
        }
      })

      // 2. Mark Purchase as CORRECTED
      await tx.purchase.update({
        where: { id: correctsPurchaseId },
        data: {
          status: 'CORRECTED',
          updatedAt: now,
        }
      })

      // 3. Create Ledger Entry
      await tx.ledgerEntry.create({
        data: {
          id: ledgerEntryId,
          customerId,
          referenceType: 'CORRECTION',
          type: amount >= 0 ? 'DEBIT' : 'CREDIT',
          amount: Math.abs(amount),
          referenceId: correctionId,
          createdAt: now,
        }
      })

      // 4. Create Timeline Event
      await tx.timelineEvent.create({
        data: {
          id: timelineEventId,
          customerId,
          entityType: 'CORRECTION',
          entityId: correctionId,
          sequenceNumber: Math.floor(Date.now() / 1000),
          createdAt: now,
        }
      })

      // 5. Update Customer Balance
      await tx.customer.update({
        where: { id: customerId },
        data: { 
          currentBalance: newBalance, 
          updatedAt: now 
        }
      })
    })

    revalidatePath(`/vendor/customers`)
    revalidatePath(`/vendor/dashboard`)

    return { success: true }
  } catch (error: unknown) {
    console.error('Add correction error:', error)
    return { error: error instanceof Error ? error.message : 'Failed to add correction' }
  }
}
