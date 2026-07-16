import { verifySession } from '@/lib/session'
import { redirect } from 'next/navigation'
import VendorLayoutClient from '@/components/vendor/VendorLayoutClient'
import { db } from '@/lib/db'

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await verifySession()

  if (!auth.isAuth || !auth.vendor) {
    redirect('/login')
  }

  const pendingApprovalsCount = await db.deviceApprovalRequest.count({
    where: { status: 'PENDING' }
  })

  return <VendorLayoutClient pendingApprovalsCount={pendingApprovalsCount}>{children}</VendorLayoutClient>
}
