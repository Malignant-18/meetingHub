// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#0f0e1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to Meeting Intelligence Hub</p>
        </div>
        <SignIn
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
              identityPreviewText: 'text-slate-300',
              identityPreviewEditButton: 'text-indigo-400',
            },
          }}
        />
      </div>
    </main>
  )
}
