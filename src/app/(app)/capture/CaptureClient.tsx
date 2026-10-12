'use client'

import { useRouter } from 'next/navigation'
import MicroCapture from '@/components/MicroCapture'

interface Props {
  workExperiences: Array<{ id: string; company: string; title: string }>
}

/**
 * Hosts the MicroCapture modal, opened immediately — this route is the target
 * of reminder emails and the PWA "Log achievement" shortcut.
 */
export default function CaptureClient({ workExperiences }: Props) {
  const router = useRouter()
  const goToDashboard = () => router.replace('/dashboard')

  return (
    <MicroCapture
      workExperiences={workExperiences}
      forceOpen
      onSaved={goToDashboard}
      onClose={goToDashboard}
    />
  )
}
