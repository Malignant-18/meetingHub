import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import LandingHero from '@/components/LandingHero'

export default function LandingPage() {
  const { userId } = auth()
  if (userId) redirect('/dashboard')

  return <LandingHero />
}
