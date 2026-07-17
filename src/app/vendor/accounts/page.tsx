import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, IndianRupee, Activity, TrendingUp } from 'lucide-react'
import { DeviceRequestActions } from '@/components/vendor/DeviceRequestActions'

export default async function VendorDashboard() {
  // Fetch high-level stats
  const customersCount = await db.customer.count({ where: { archivedAt: null } })
  
  // In a real app we'd fetch from DailySummary/MonthlySummary. 
  // We'll aggregate pending balances directly for now.
  const allCustomers = await db.customer.findMany({ select: { currentBalance: true }})
  const totalPending = allCustomers.reduce((acc, c) => acc + c.currentBalance, 0)

  // Dynamic daily stats
  const startOfDay = BigInt(new Date().setHours(0, 0, 0, 0))
  
  const newCustomersToday = await db.customer.count({
    where: { archivedAt: null, createdAt: { gte: startOfDay } }
  })

  const todayPayments = await db.payment.aggregate({
    where: { createdAt: { gte: startOfDay } },
    _sum: { amount: true }
  })
  const collectionsToday = todayPayments._sum.amount || 0
  
  const todayPaymentsCount = await db.payment.count({
    where: { createdAt: { gte: startOfDay } }
  })

  // Fetch real pending requests
  const pendingRequests = await db.deviceApprovalRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { requestedAt: 'desc' },
    take: 10
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Total Outstanding</CardTitle>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900 tracking-tight">₹{totalPending}</div>
            <p className="text-sm text-zinc-500 mt-1">
              Across <span className="font-medium text-zinc-700">{customersCount}</span> active customers
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Active Customers</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900 tracking-tight">{customersCount}</div>
            <p className="text-sm text-zinc-500 mt-1">
              {newCustomersToday > 0 ? (
                <><span className="text-emerald-600 font-medium">+{newCustomersToday}</span> from today</>
              ) : (
                'No new customers today'
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Today&apos;s Collections</CardTitle>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900 tracking-tight">₹{collectionsToday}</div>
            <p className="text-sm text-zinc-500 mt-1">
              {todayPaymentsCount} payment{todayPaymentsCount === 1 ? '' : 's'} recorded today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-zinc-200/60 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Device Requests</CardTitle>
            <div className="p-2 bg-amber-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-900 tracking-tight">{pendingRequests.length}</div>
            <p className="text-sm text-zinc-500 mt-1">
              Pending approvals
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
