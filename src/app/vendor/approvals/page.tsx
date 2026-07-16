import { db } from '@/lib/db'
import { DeviceRequestActions } from '@/components/vendor/DeviceRequestActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, Laptop, Smartphone } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const pendingRequests = await db.deviceApprovalRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { requestedAt: 'desc' }
  })

  // Fetch customer names for these phones
  const phones = [...new Set(pendingRequests.map(req => req.phone))]
  const customers = await db.customer.findMany({
    where: { phone: { in: phones } }
  })
  const customerMap = new Map(customers.map(c => [c.phone, c.name]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Device Approvals</h1>
        <p className="text-zinc-500">Manage pending device login requests from your customers.</p>
      </div>

      <Card className="bg-white border-zinc-200/60 shadow-sm">
        <CardHeader className="border-b border-zinc-100 bg-zinc-50/50">
          <CardTitle className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-500" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border border-zinc-100">
                <ShieldCheck className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-sm font-medium text-zinc-900">No pending approvals</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                There are currently no devices waiting for your approval. When a customer tries to log in on a new device, it will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {pendingRequests.map(req => {
                const isMobile = req.os?.toLowerCase().includes('android') || req.os?.toLowerCase().includes('ios')
                const customerName = customerMap.get(req.phone) || 'Unknown Customer'
                
                return (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 hover:bg-zinc-50/50 transition-colors bg-white rounded-lg sm:rounded-none sm:bg-transparent border sm:border-0 border-zinc-100 mx-4 sm:mx-0 mb-4 sm:mb-0 shadow-sm sm:shadow-none">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="mt-1 p-2 bg-zinc-100 text-zinc-600 rounded-lg shrink-0">
                        {isMobile ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-base font-semibold text-zinc-900 truncate">{customerName}</span>
                          <span className="text-sm font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{req.phone}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1.5">
                          <span className="text-sm text-zinc-600 break-words line-clamp-2 sm:line-clamp-none">{req.browser} on {req.os}</span>
                          <span className="hidden sm:inline text-zinc-300">•</span>
                          <span className="text-xs sm:text-sm text-zinc-500 font-medium">
                            {new Date(Number(req.requestedAt)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="shrink-0 flex items-center justify-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 sm:mt-0">
                      <DeviceRequestActions requestId={req.id} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
