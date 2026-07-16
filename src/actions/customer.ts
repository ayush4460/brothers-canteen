'use server'

import { db } from '@/lib/db'
import { createSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

const globalWithIo = global as any

export async function requestDeviceApproval(data: {
  phone: string
  deviceId: string
  browser: string
  os: string
  ip: string
}) {
  try {
    // Strict 10 digit check
    const digitsOnly = data.phone.replace(/\D/g, '')
    if (digitsOnly.length !== 10) {
      return { error: 'Please enter a valid 10-digit phone number.' }
    }

    const e164Phone = `+91${digitsOnly}`

    // Ensure the customer actually exists in the system
    const customer = await db.customer.findUnique({
      where: { phone: e164Phone }
    })

    if (!customer || customer.archivedAt) {
      return { error: 'No active customer found with this number.' }
    }

    // Check for an existing approved device
    const existingDevice = await db.device.findFirst({
      where: { id: data.deviceId, customer: { phone: e164Phone } }
    })

    if (existingDevice) {
      // Create session for the customer
      await createSession(undefined, customer.id, existingDevice.id, data.ip, data.browser)
      return { success: true, redirect: '/c/chat' }
    }

    const expiresAt = BigInt(Date.now() + 24 * 60 * 60 * 1000)
    
    await db.deviceApprovalRequest.create({
      data: {
        phone: e164Phone,
        deviceId: data.deviceId,
        browser: data.browser.substring(0, 255),
        os: data.os,
        ip: data.ip,
        status: 'PENDING',
        requestedAt: BigInt(Date.now()),
        expiresAt
      }
    })

    if (globalWithIo.io) {
      globalWithIo.io.to('vendor_dashboard').emit('new_device_approval')
    }

    return { success: true }
  } catch (error) {
    console.error('Request device error:', error)
    return { error: 'Failed to request approval.' }
  }
}

export async function forceRefreshCustomer() {
  revalidatePath('/c', 'layout')
}
