export function stripPII(text: string): string {
  return text
    // Email addresses
    .replace(/\b[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?\b/g, '[email]')

    // Phone numbers — international and local formats
    // Covers: +44 7700 000000, (555) 123-4567, 07700 000000, +1-800-555-0199, etc.
    .replace(/(?:\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,5}(?:[\s\-.]?\d{1,4})?/g, '[phone]')

    // LinkedIn URLs — scheme is optional because CVs usually write the bare "linkedin.com/in/…"
    .replace(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/\S+/gi, '[linkedin-url]')

    // GitHub URLs — same, bare "github.com/…" is the common form
    .replace(/(?:https?:\/\/)?(?:www\.)?github\.com\/\S+/gi, '[github-url]')

    // Personal portfolio / website URLs (keep job-related URLs like company sites intact — only strip obvious personal domains)
    // Heuristic: URLs that appear on a line starting with "website", "portfolio", "site", "url"
    .replace(/(?:website|portfolio|site|personal url|web)[\s:]+https?:\/\/\S+/gi, (match) =>
      match.replace(/https?:\/\/\S+/i, '[portfolio-url]')
    )

    // Physical address patterns
    // House/flat number + street
    .replace(/\b(?:flat|apartment|apt|unit|suite|house|no\.?)[\s#]?\d+[,\s]+[\w\s]+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|close|way|place|pl)\b/gi, '[address]')
    // Postcode — UK
    .replace(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/gi, '[postcode]')
    // ZIP code — US
    .replace(/\b\d{5}(?:-\d{4})?\b/g, '[zip]')

    // National Insurance Number (UK)
    .replace(/\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, '[national-id]')

    // Social Security Number (US)
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn]')

    // Date of birth — when labelled explicitly
    .replace(/(?:date of birth|dob|d\.o\.b|born on|born:)[\s:]+[\d\/\-\.]+/gi, '[dob]')

    // Clean up any double spaces left by replacements
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
