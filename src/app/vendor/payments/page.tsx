import { verifySession } from '@/lib/session'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowUpRight } from 'lucide-react'

export default async function VendorPaymentsPage() {
  const auth = await verifySession()
  if (!auth.isAuth || !auth.vendor) redirect('/login')

  const recentPayments = await db.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      customer: true
    }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Payments History</h1>
          <p className="text-sm text-zinc-500 mt-1">A timeline of all recent payments received from customers.</p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        {recentPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-zinc-400 text-xl font-medium">₹</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">No payments yet</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm">
              Payments received from your customers will appear here in real-time.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {recentPayments.map(payment => (
              <li key={payment.id} className="group hover:bg-zinc-50 transition-colors p-4 sm:px-6">
                <Link href={`/vendor/customers/${payment.customerId}`} className="flex items-center justify-between gap-4 w-full">
                  
                  {/* Left Side: Avatar/Icon and Details */}
                  <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center text-emerald-600">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 truncate">
                          {payment.customer.name || payment.customer.phone}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                        {new Date(Number(payment.createdAt)).toLocaleString('en-IN', { 
                          day: 'numeric', month: 'short', year: 'numeric', 
                          hour: '2-digit', minute: '2-digit', hour12: true 
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Right Side: Amount */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-bold text-zinc-900 text-sm sm:text-base">
                      + ₹{payment.amount}
                    </span>
                  </div>

                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
