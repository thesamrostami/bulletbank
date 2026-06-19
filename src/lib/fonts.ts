import { Exo_2, DM_Sans, Plus_Jakarta_Sans } from 'next/font/google'

export const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
})

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-body',
})

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
})
