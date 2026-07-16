import { verifySession } from '@/lib/session'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { FileText, Download } from 'lucide-react'

export default async function VendorStatementsPage() {
  const auth = await verifySession()
  if (!auth.isAuth || !auth.vendor) redirect('/login')

  const customers = await db.customer.findMany({
    orderBy: { currentBalance: 'desc' },
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Generate Statements</h1>
          <p className="text-sm text-zinc-500 mt-1">Download PDF statements of account for any customer.</p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">No customers found</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm">
              You don't have any customers yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {customers.map(customer => (
              <li key={customer.id} className="group hover:bg-zinc-50 transition-colors p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Left Side: Avatar/Icon and Details */}
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-semibold text-zinc-900 truncate">
                      {customer.name || 'Unnamed Customer'}
                    </span>
                    <span className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                      {customer.phone}
                    </span>
                  </div>
                </div>

                {/* Right Side: Balance and Action */}
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full mt-2 sm:mt-0 pl-13 sm:pl-0">
                  <div className="flex flex-col sm:items-end">
                    <span className="text-xs text-zinc-500 mb-0.5">Balance</span>
                    <span className={`font-bold text-sm sm:text-base ${customer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ₹{customer.currentBalance}
                    </span>
                  </div>
                  
                  <a 
                    href={`/vendor/customers/${customer.id}/statement`} 
                    target="_blank"
                    className="inline-flex shrink-0 items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 shadow-sm transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4 text-zinc-400" />
                    <span className="hidden sm:inline">Download</span> PDF
                  </a>
                </div>

              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
