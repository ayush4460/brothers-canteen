'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { createSession, deleteSession } from '@/lib/session'

const globalWithIo = global as any

export async function createCustomer(data: { phone: string; name: string }) {
  try {
    const digitsOnly = data.phone.replace(/\D/g, '')
    if (digitsOnly.length !== 10) {
      return { error: 'Please enter a valid 10-digit phone number.' }
    }

    const e164Phone = `+91${digitsOnly}`

    const existing = await db.customer.findUnique({
      where: { phone: e164Phone }
    })

    if (existing) {
      return { error: 'A customer with this phone number already exists.' }
    }

    const now = BigInt(Date.now())

    await db.customer.create({
      data: {
        phone: e164Phone,
        name: data.name,
        currentBalance: 0,
        totalCollected: 0,
        createdAt: now,
        updatedAt: now,
      }
    })

    revalidatePath('/vendor/customers')
    revalidatePath('/vendor/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Create customer error:', error)
    return { error: 'Failed to create customer.' }
  }
}

export async function approveDeviceRequest(requestId: string) {
  try {
    const request = await db.deviceApprovalRequest.findUnique({
      where: { id: requestId }
    })
    
    if (!request || request.status !== 'PENDING') return { error: 'Invalid request' }

    const customer = await db.customer.findUnique({
      where: { phone: request.phone }
    })

    if (!customer) return { error: 'Customer not found' }

    // Atomic transaction to approve and create device
    await db.$transaction([
      db.deviceApprovalRequest.update({
        where: { id: requestId },
        data: { 
          status: 'APPROVED'
        }
      }),
      db.device.create({
        data: {
          id: request.deviceId,
          customerId: customer.id,
          fingerprint: request.deviceId,
          createdAt: BigInt(Date.now()),
          updatedAt: BigInt(Date.now()),
        }
      })
    ])

    revalidatePath('/vendor/approvals')
    revalidatePath('/vendor/dashboard')
    
    if (globalWithIo.io) {
      globalWithIo.io.to('vendor_dashboard').emit('device_approval_handled')
      globalWithIo.io.to(`device_${request.deviceId}`).emit('device_approval_status', { status: 'APPROVED' })
    }

    return { success: true }
  } catch (error) {
    console.error('Approve device error:', error)
    return { error: 'Failed to approve device.' }
  }
}

export async function rejectDeviceRequest(requestId: string) {
  try {
    const request = await db.deviceApprovalRequest.findUnique({
      where: { id: requestId }
    })
    
    if (request) {
      await db.deviceApprovalRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      })

      revalidatePath('/vendor/approvals')
      revalidatePath('/vendor/dashboard')

      if (globalWithIo.io) {
        globalWithIo.io.to('vendor_dashboard').emit('device_approval_handled')
        globalWithIo.io.to(`device_${request.deviceId}`).emit('device_approval_status', { status: 'REJECTED' })
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Reject device error:', error)
    return { error: 'Failed to reject device request.' }
  }
}

export async function updatePrivateNotes(customerId: string, notes: string) {
  try {
    await db.customer.update({
      where: { id: customerId },
      data: { privateNotes: notes }
    })
    
    revalidatePath(`/vendor/customers/${customerId}`)
    revalidatePath('/vendor/customers')
    return { success: true }
  } catch (error) {
    console.error('Update private notes error:', error)
    return { error: 'Failed to update private notes.' }
  }
}

export async function editCustomer(customerId: string, data: { name: string, phone: string }) {
  try {
    const digitsOnly = data.phone.replace(/\D/g, '')
    if (digitsOnly.length !== 10) {
      return { error: 'Please enter a valid 10-digit phone number.' }
    }
    const e164Phone = `+91${digitsOnly}`

    const customer = await db.customer.findUnique({ where: { id: customerId } })
    if (!customer) return { error: 'Customer not found.' }

    if (customer.phone !== e164Phone) {
      const existing = await db.customer.findUnique({ where: { phone: e164Phone } })
      if (existing) {
        return { error: 'A customer with this phone number already exists.' }
      }

      // Phone number changed: perform transaction to update and clear old sessions/devices
      await db.$transaction([
        db.deviceApprovalRequest.deleteMany({ where: { phone: customer.phone } }),
        db.deviceApprovalRequest.deleteMany({ where: { phone: e164Phone } }),
        db.session.deleteMany({ where: { customerId } }),
        db.device.deleteMany({ where: { customerId } }),
        db.customer.update({
          where: { id: customerId },
          data: { name: data.name, phone: e164Phone, updatedAt: BigInt(Date.now()) }
        })
      ])
    } else {
      await db.customer.update({
        where: { id: customerId },
        data: { name: data.name, updatedAt: BigInt(Date.now()) }
      })
    }

    revalidatePath('/vendor/customers')
    revalidatePath('/vendor/dashboard')
    revalidatePath(`/vendor/customers/${customerId}`)

    return { success: true, phoneChanged: customer.phone !== e164Phone }
  } catch (error) {
    console.error('Edit customer error:', error)
    return { error: 'Failed to edit customer.' }
  }
}
