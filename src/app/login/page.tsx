import LoginForm from '@/components/vendor/LoginForm'

export default function VendorLoginPage() {
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
        <LoginForm />
      </div>
    </div>
  )
}
