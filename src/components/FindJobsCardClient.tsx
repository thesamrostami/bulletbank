'use client'

import dynamic from 'next/dynamic'

const FindJobsCard = dynamic(() => import('./FindJobsCard'), { ssr: false })

export default FindJobsCard
