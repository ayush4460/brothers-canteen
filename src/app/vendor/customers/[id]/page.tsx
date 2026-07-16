import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react'
import RecordPaymentModal from '@/components/vendor/RecordPaymentModal'
import PrivateNotes from '@/components/vendor/PrivateNotes'

export default async function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const customer = await db.customer.findUnique({
    where: { id }
  })

  if (!customer) return notFound()

  // Fetch the ledger entries for chronological timeline
  const timeline = await db.ledgerEntry.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/vendor/customers" className="p-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors shrink-0">
            <ChevronLeft className="h-5 w-5 text-zinc-600" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">{customer.name}</h2>
            <p className="text-zinc-500 text-sm font-medium">{customer.phone}</p>
          </div>
        </div>
        <a 
          href={`/vendor/customers/${customer.id}/statement`}
          target="_blank"
          className="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 h-9 rounded-md text-sm font-medium transition-colors shadow-sm w-full sm:w-auto shrink-0"
        >
          <FileText className="h-4 w-4" />
          View Statement
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200/60 shadow-sm rounded-xl p-6">
          <div className="text-sm font-medium text-zinc-500">Total Outstanding</div>
          <div className="text-3xl font-bold text-red-600 mt-2">₹{customer.currentBalance}</div>
        </div>
        <div className="bg-white border border-zinc-200/60 shadow-sm rounded-xl p-6">
          <div className="text-sm font-medium text-zinc-500">Total Collected Lifetime</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">₹{customer.totalCollected}</div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200/60 shadow-sm rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-semibold text-zinc-900">Chronological Timeline</h3>
          <div className="flex shrink-0">
            <RecordPaymentModal 
              customerId={customer.id} 
              customerName={customer.name || 'Customer'} 
              pendingBalance={customer.currentBalance} 
            />
          </div>
        </div>
        
        <div className="divide-y divide-zinc-100 max-h-[600px] overflow-y-auto">
          {timeline.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No activity found for this customer yet.
            </div>
          ) : (
            timeline.map(event => {
              const isPurchase = event.referenceType === 'PURCHASE'
              const Icon = isPurchase ? ArrowUpRight : ArrowDownRight
              const iconColor = isPurchase ? 'text-red-600' : 'text-emerald-600'
              const amountColor = isPurchase ? 'text-red-600' : 'text-emerald-600'
              const bgColor = isPurchase ? 'bg-red-50' : 'bg-emerald-50'

              return (
                <div key={event.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${bgColor}`}>
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900">
                        {isPurchase ? 'Purchase' : 'Payment Received'}
                      </div>
                      <div className="text-xs font-medium text-zinc-500 mt-0.5">
                        {new Date(Number(event.createdAt)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className={`font-semibold text-lg shrink-0 ${amountColor}`}>
                    {isPurchase ? '+' : '-'}₹{event.amount}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <PrivateNotes customerId={customer.id} initialNotes={customer.privateNotes} />
    </div>
  )
}
