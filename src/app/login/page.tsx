import LoginForm from '@/components/vendor/LoginForm'

export default function VendorLoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col justify-center py-12 sm:px-6 lg:px-8 bg-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-zinc-900">
          Brothers Canteen
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Sign in to the Vendor Dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-50 py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-zinc-200">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
