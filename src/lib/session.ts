import 'server-only'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { createId } from '@paralleldrive/cuid2'

export async function createSession(vendorId?: string, customerId?: string, deviceId?: string, ip?: string, userAgent?: string) {
  const expiresAt = BigInt(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  const now = BigInt(Date.now())
  const id = createId()
  
  await db.session.create({
    data: {
      id,
      vendorId,
      customerId,
      deviceId,
      ip,
      userAgent,
      expiresAt,
      lastSeen: now,
      createdAt: now,
    }
  })

  const cookieStore = await cookies()
  cookieStore.set('session', id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(Number(expiresAt)),
    maxAge: 30 * 24 * 60 * 60, // 30 days
    sameSite: 'lax',
    path: '/',
  })
}

export async function verifySession() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  
  if (!cookie) return { isAuth: false }

  const session = await db.session.findUnique({
    where: { id: cookie },
    include: { vendor: true, customer: true, device: true }
  })

  if (!session) return { isAuth: false }

  if (session.expiresAt < BigInt(Date.now())) {
    return { isAuth: false }
  }

  // Throttle lastSeen updates to once an hour
  if (BigInt(Date.now()) - session.lastSeen > BigInt(60 * 60 * 1000)) {
    await db.session.update({
      where: { id: session.id },
      data: { lastSeen: BigInt(Date.now()) }
    }).catch(() => {})
  }

  return { 
    isAuth: true, 
    session,
    vendor: session.vendor,
    customer: session.customer,
    device: session.device
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('session')?.value
  
  if (cookie) {
    await db.session.delete({
      where: { id: cookie }
    }).catch(() => {})
  }
  
  cookieStore.delete('session')
}
