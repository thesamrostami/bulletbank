// ─── Status & enums ──────────────────────────────────────────────────────────

export type JobStatus =
  | 'Saved' | 'Applied' | 'Screening' | 'Interview Scheduled'
  | 'Offer' | 'Rejected' | 'Withdrawn'

export type BulletType = 'summary' | 'highlight' | 'experience' | 'project'

export type EmploymentType =
  | 'Full-time' | 'Part-time' | 'Contract'
  | 'Freelance' | 'Internship' | 'Apprenticeship' | 'Volunteer'

export type WorkType = 'Remote' | 'Hybrid' | 'On-site' | 'Flexible'

export type Seniority = 'Graduate' | 'Mid-level' | 'Senior' | 'Lead' | 'Head'

// ─── Core profile ────────────────────────────────────────────────────────────

export interface Profile {
  user_id: string
  // Personal info
  full_name: string | null
  email: string | null
  phone: string | null
  location_city: string | null
  location_country: string | null
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  additional_links: Array<{ label: string; url: string }> | null
  website_url: string | null
  // Job search preferences
  job_search_locations: string[]
  work_authorisation: string | null
  willing_to_relocate: boolean
  preferred_work_type: WorkType
  // Professional summary
  bio: string | null
  positioning_headline: string | null
  // Skills
  skills_core: string[]
  skills_proficient: string[]
  skills_familiar: string[]
  languages: string[]
  // Career metadata
  job_titles: string[]
  seniority: Seniority | null
  years_experience: number | null
  experience: string | null
  // System
  onboarding_complete: boolean
  plan: string
  credit_balance: number
  conversation_history: ConversationMessage[] | null
  updated_at: string
}

// ─── CV sections ─────────────────────────────────────────────────────────────

export interface WorkExperience {
  id: string
  user_id: string
  company: string
  title: string
  employment_type: EmploymentType
  location: string | null
  is_remote: boolean
  start_date: string        // ISO date string YYYY-MM-DD
  end_date: string | null
  is_current: boolean
  description: string | null
  order_index: number
  created_at: string
}

export interface Education {
  id: string
  user_id: string
  institution: string
  degree: string | null
  field_of_study: string | null
  start_date: string | null
  end_date: string | null
  is_current: boolean
  grade: string | null
  description: string | null
  order_index: number
  created_at: string
}

export interface Certification {
  id: string
  user_id: string
  name: string
  issuing_organisation: string | null
  issue_date: string | null
  expiry_date: string | null
  no_expiry: boolean
  credential_id: string | null
  credential_url: string | null
  order_index: number
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  url: string | null
  repo_url: string | null
  tech_stack: string[]
  start_date: string | null
  end_date: string | null
  is_ongoing: boolean
  highlight: boolean
  order_index: number
  created_at: string
}

// ─── Bullet bank ─────────────────────────────────────────────────────────────

export interface BulletBank {
  id: string
  user_id: string
  bullet_id: string
  type: BulletType
  role_context: string | null
  work_experience_id: string | null
  project_id: string | null
  text: string
  skill_tags: string[]
  has_metric: boolean
  metric_text: string | null
  star_story: string | null
  times_used: number
  last_defended_at: string | null
  is_finalised: boolean
  source: string
  created_at: string
}

export interface CVVariant {
  id: string
  user_id: string
  name: string
  summary_bullet_id: string | null
  bullet_ids: string[]
  deselected_skills: string[]
  created_at: string
  last_used_at: string | null
}

export interface DebriefInsight {
  id: string
  user_id: string
  job_id: string
  question: string
  question_type: string | null
  role_archetype: string | null
  bullet_ids_used: string[]
  outcome: string | null
  user_notes: string | null
  created_at: string
}

// ─── Jobs & applications ─────────────────────────────────────────────────────

export interface CategorisedGap {
  requirement: string
  category: 'skill' | 'qualification' | 'experience'
  advice?: string
  searchQuery?: string
}

export type RoleArchetype =
  | 'IC_Technical'
  | 'IC_Clinical'
  | 'Technical_Lead'
  | 'Management'
  | 'Commercial'
  | 'Research'
  | 'Other'

export interface FitAnalysis {
  matched: string[]
  partial: string[]
  gaps: string[]
  summary: string
  categorisedGaps?: CategorisedGap[]
  transferability_note?: string | null
  archetype?: RoleArchetype
  archetype_framing?: string
}

export interface Job {
  id: string
  user_id: string
  url: string | null
  company: string
  role: string
  location: string | null
  raw_text: string | null
  requirements: string[]
  status: JobStatus
  date_applied: string
  interview_date: string | null
  notes: string | null
  cover_letter: string | null
  cv_bullet_ids: string[]
  cv_summary_id: string | null
  interview_debrief: InterviewDebrief | null
  fit_score: number | null
  fit_analysis: FitAnalysis | null
  cv_snapshot: CVSnapshot | null
  preferred_cv_template: string | null
  cover_letter_version: number
  cv_downloaded_at: string | null
  cover_letter_downloaded_at: string | null
  own_cv_url: string | null
  own_cv_filename: string | null
  own_cv_text: string | null
  own_cover_letter_url: string | null
  own_cover_letter_filename: string | null
  document_source: 'generated' | 'uploaded' | 'mixed' | null
  ranking_cache: BulletMatch[] | null
  ranking_cached_at: string | null
  rewrite_snapshot: CVRewriteResponse | null
  cv_rewrite_source: 'manual' | 'ai_tailored' | 'uploaded' | null
  created_at: string
}

export interface InterviewDebrief {
  questions_asked: string[]
  bullets_used: string[]
  outcome_notes: string
  logged_at: string
}

// ─── AI / analysis types ─────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ExtractedJob {
  company: string
  role: string
  location: string
  requirements: string[]
  raw_text: string
}

export interface BulletMatch {
  bullet: BulletBank
  score: number
  reasoning: string
  recommend: boolean
}

// ─── Full CV snapshot ────────────────────────────────────────────────────────

export interface CVSnapshot {
  profile: Profile
  workExperiences: Array<WorkExperience & { bullets: BulletBank[] }>
  education: Education[]
  certifications: Certification[]
  projects?: Array<Project & { bullets: BulletBank[] }>
  highlightBullets?: BulletBank[]
  summaryBullets?: BulletBank[]
  skills_line?: string[]
}

// ─── CV Rewrite ──────────────────────────────────────────────────────────────

export interface CVRewriteBullet {
  bullet_id: string
  text: string
  type: 'summary' | 'highlight' | 'experience'
  skill_tags?: string[]
  has_metric?: boolean
  metric_text?: string | null
}

export interface CVRewriteWorkExperience {
  id: string
  company: string
  title: string
  start_date: string
  end_date: string | null
  is_current: boolean
  bullets: CVRewriteBullet[]
}

export interface CVRewriteResult {
  // Old format fields (optional for backward compat with saved snapshots)
  summaryBullets?: CVRewriteBullet[]
  highlightBullets?: CVRewriteBullet[]
  skills?: {
    reordered_core: string[]
    reordered_proficient: string[]
    reordered_familiar: string[]
    suggested_additions: string[]
  }
  // New format fields
  skills_line?: string[]
  workExperiences: CVRewriteWorkExperience[]
  positioning_headline: string
  keyword_alignment: {
    matched_keywords: string[]
    missing_keywords: string[]
    keyword_density_note?: string
  }
}

export interface CVRewriteResponse {
  rewrittenCV: CVRewriteResult
  changes_summary: string
}

// ─── Onboarding wizard ───────────────────────────────────────────────────────

export interface IntakeQuestion {
  id: string
  field: string
  question: string
  type: 'text' | 'textarea' | 'tags' | 'date-range' | 'select'
  options?: string[]
  placeholder?: string
  required: boolean
}

// ─── Update intake ────────────────────────────────────────────────────────────

export interface UpdateExtractResult {
  newWorkExperiences: Partial<WorkExperience>[]
  newEducation: Partial<Education>[]
  newCertifications: Partial<Certification>[]
  newProjects: Partial<Project>[]
  newSkills: Array<{ skill: string; suggestedLevel: 'core' | 'proficient' | 'familiar' }>
  updatesToExisting: Array<{
    type: 'work_experience' | 'education' | 'certification' | 'project'
    existingId: string
    existingLabel: string
    suggestedChanges: Record<string, unknown>
  }>
  unclassified: string[]
}

export interface BulletDiagnosis {
  weaknesses: string[]
  hasImprovementPotential: boolean
  question: string | null
  improvedVersion: string | null
}

// ─── Legacy types (used by existing profile builder) ─────────────────────────

export interface CoverageState {
  skills: boolean
  experience: boolean
  achievements: boolean
  goals: boolean
}

export interface RoleCard {
  title: string
  rationale: string
  matchingSkills: string[]
}

export interface PositioningData {
  positioningHeadline: string
  roleCards: RoleCard[]
  skillGroups: {
    core: string[]
    proficient: string[]
    familiar: string[]
  }
}

export interface PrepModule {
  type: 'flashcard' | 'questions' | 'metrics' | 'cover_letter' | 'company'
  content: unknown
}
