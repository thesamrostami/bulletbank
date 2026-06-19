import { stripPII } from './strip-pii'

const cases: [string, string, string][] = [
  ['email', 'Contact me at john.doe@gmail.com for more info', 'Contact me at [email] for more info'],
  ['UK phone', 'Mobile: +44 7700 900123', 'Mobile: [phone]'],
  ['US phone', 'Call (555) 123-4567 anytime', 'Call [phone] anytime'],
  ['LinkedIn', 'linkedin.com/in/johndoe', '[linkedin-url]'],
  ['GitHub', 'github.com/johndoe', '[github-url]'],
  ['UK postcode', 'London, SW1A 1AA', 'London, [postcode]'],
  ['US ZIP', 'New York, NY 10001', 'New York, NY [zip]'],
  ['NI number', 'NI: AB 12 34 56 C', 'NI: [national-id]'],
  ['SSN', 'SSN: 123-45-6789', 'SSN: [ssn]'],
  ['DOB label', 'Date of Birth: 15/04/1990', '[dob]'],
  ['career content preserved', 'Led a team of 5 engineers at Acme Corp', 'Led a team of 5 engineers at Acme Corp'],
  ['year preserved', 'Worked at Google from 2018 to 2022', 'Worked at Google from 2018 to 2022'],
]

describe('stripPII', () => {
  for (const [label, input, expected] of cases) {
    it(label, () => {
      expect(stripPII(input)).toBe(expected)
    })
  }
})
