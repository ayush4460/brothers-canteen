import CustomerLoginForm from '@/components/customer/CustomerLoginForm'
import { Coffee } from 'lucide-react'

export default function CustomerLoginPage() {
  return (
    <div className="min-h-screen bg-[#f0f2f5] relative flex flex-col font-sans">
      {/* Top Green Banner */}
      <div className="absolute top-0 left-0 w-full h-[222px] bg-[#00a884] z-0 hidden sm:block"></div>
      
      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col items-center pt-8 sm:pt-[5vh] px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8 sm:mb-10 text-[#00a884] sm:text-white">
            <div className="bg-white/10 p-2 rounded-full">
              <Coffee className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-normal tracking-tight">
              Brothers Canteen
            </h2>
          </div>

          {/* Card */}
          <div className="bg-white py-10 px-6 sm:px-12 shadow-lg rounded-2xl sm:rounded-xl">
            <div className="mb-8 text-center">
              <h3 className="text-[22px] text-[#41525d] font-normal leading-normal">
                Access your account
              </h3>
              <p className="mt-2 text-[15px] text-[#8696a0]">
                Enter your phone number to continue to Brothers Canteen.
              </p>
            </div>
            
            <CustomerLoginForm />
          </div>
          
        </div>
      </div>
    </div>
  )
}
