import VendorLoginForm from '@/components/vendor/LoginForm'
import { verifySession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function VendorLoginPage() {
  const auth = await verifySession()
  if (auth.isAuth && auth.vendor) redirect('/vendor/dashboard')

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-50/50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-zinc-200/60">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Brothers Canteen
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Sign in to the Vendor Dashboard
          </p>
        </div>
        <VendorLoginForm />
      </div>
    </div>
  )
}
