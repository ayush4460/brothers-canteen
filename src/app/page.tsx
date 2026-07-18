import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/session'

export default async function Home() {
  const auth = await verifySession()
  
  if (auth.isAuth) {
    if (auth.vendor) redirect('/vendor/dashboard')
    if (auth.customer) redirect('/c/chat')
  }
  
  redirect('/c/login')
}
