import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimitWithDb, rateLimitResponse } from '@/lib/request-rate-limit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    const rl = await checkRateLimitWithDb(supabase, `document-url:${user.id}`, { limit: 30, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await params
    const type = req.nextUrl.searchParams.get('type')
    if (type !== 'cv' && type !== 'cover_letter') {
      return NextResponse.json({ error: 'Invalid type. Use type=cv or type=cover_letter' }, { status: 400 })
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('own_cv_url, own_cover_letter_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 })

    const stored: string | null = type === 'cv' ? job.own_cv_url : job.own_cover_letter_url
    if (!stored) return NextResponse.json({ error: 'No uploaded document of this type', code: 'NOT_FOUND' }, { status: 404 })

    let path = stored
    if (stored.startsWith('http')) {
      // Legacy row: before the storage-path refactor this column held a 7-day
      // signed URL. Files follow `${user.id}/${id}/${type}.${ext}`, so look for
      // a file matching the type in the job's folder.
      const { data: entries, error: listError } = await supabase.storage
        .from('job-documents')
        .list(`${user.id}/${id}`)
      if (listError) {
        console.error('[document-url] Failed to list storage folder for legacy row:', listError.message)
      }
      const match = (entries ?? []).find(e => e.name.startsWith(`${type}.`))
      if (!match) {
        return NextResponse.json({
          error: 'This document link has expired. Please re-upload the file.',
          code: 'NOT_FOUND',
        }, { status: 404 })
      }
      path = `${user.id}/${id}/${match.name}`
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from('job-documents')
      .createSignedUrl(path, 300)

    if (signedError || !signed) {
      console.error('[document-url] Failed to create signed URL:', signedError?.message)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err) {
    console.error('[document-url GET]', err)
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
