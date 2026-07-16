import { db } from '@/lib/db'
import AddCustomerModal from '@/components/vendor/AddCustomerModal'
import CustomerTable from '@/components/vendor/CustomerTable'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const customers = await db.customer.findMany({
    where: { archivedAt: null },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end sm:justify-between gap-4">
        <h2 className="hidden sm:block text-2xl font-bold tracking-tight text-zinc-900">Customers</h2>
        <div className="w-full sm:w-auto">
          <AddCustomerModal />
        </div>
      </div>

      <CustomerTable customers={customers} />
    </div>
  )
}
