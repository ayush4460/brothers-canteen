'use server'

import { db } from '@/lib/db'
import { verifySession } from '@/lib/session'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:support@brotherscanteen.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function subscribeToPush(subscription: any) {
  const auth = await verifySession()
  if (!auth.isAuth) return { error: 'Not authenticated' }

  try {
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint }
    })

    if (!existing) {
      await db.pushSubscription.create({
        data: {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          customerId: auth.customer?.id,
          vendorId: auth.vendor?.id,
          createdAt: BigInt(Date.now())
        }
      })
    } else {
      // Update existing if it changed users
      await db.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: {
          customerId: auth.customer?.id,
          vendorId: auth.vendor?.id,
        }
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to subscribe:', error)
    return { error: 'Failed to save subscription' }
  }
}

export async function unsubscribeFromPush(endpoint: string) {
  try {
    await db.pushSubscription.delete({
      where: { endpoint }
    })
    return { success: true }
  } catch (error) {
    return { error: 'Failed to delete subscription' }
  }
}

export async function sendNotification(userId: string, userType: 'customer' | 'vendor', title: string, body: string, url: string) {
  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: userType === 'customer' 
        ? { customerId: userId } 
        : (userId === 'all_vendors' ? { vendorId: { not: null } } : { vendorId: userId })
    })

    if (subscriptions.length === 0) return

    const payload = JSON.stringify({ title, body, url })

    const sendPromises = subscriptions.map(sub => 
      webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }, payload).catch(async (e) => {
        if (e.statusCode === 410 || e.statusCode === 404) {
          // Subscription expired or unsubscribed
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
      })
    )

    await Promise.all(sendPromises)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}
