// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#0f0e1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Start turning meetings into knowledge</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-[#1e1c32] border border-slate-700 shadow-xl rounded-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-slate-400',
              socialButtonsBlockButton: 'border border-slate-600 bg-[#2d2a4a] text-white hover:bg-[#3d3a5a]',
              formFieldLabel: 'text-slate-300',
              formFieldInput: 'bg-[#2d2a4a] border-slate-600 text-white',
              formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-500',
              footerActionLink: 'text-indigo-400 hover:text-indigo-300',
            },
          }}
        />
      </div>
    </main>
  )
}
