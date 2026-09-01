export const SERVICE_TYPES = {
  DIGITAL_MARKETING_FULL_SUITE: 'Digital Marketing (Full Suite)',
  SEO_CONTENT: 'SEO + Content',
  PERFORMANCE_MARKETING_PPC: 'Performance Marketing (PPC)',
  SOCIAL_MEDIA: 'Social Media Management',
  BRAND_STRATEGY: 'Brand Strategy',
  WEBSITE_DEVELOPMENT: 'Website Development',
} as const

export const PPC_SERVICE_TYPE_VARIANTS = [
  'Performance Marketing (PPC)',
  'Performance Marketing',
  'PPC',
  'Paid Media',
  'Lead Generation',
  'Growth Marketing',
  'Paid Marketing',
  'Paid Marketing Plans',
]

export const SERVICE_TYPE_ALIASES: Record<string, string> = {
  'Performance Marketing': 'Performance Marketing (PPC)',
  'PPC': 'Performance Marketing (PPC)',
  'Paid Media': 'Performance Marketing (PPC)',
  'Lead Generation': 'Performance Marketing (PPC)',
  'Growth Marketing': 'Performance Marketing (PPC)',
  'Paid Marketing': 'Performance Marketing (PPC)',
  'Paid Marketing Plans': 'Performance Marketing (PPC)',
}

export function normalizeServiceType(serviceType: string): string {
  if (!serviceType) return serviceType
  const trimmed = serviceType.trim()
  return SERVICE_TYPE_ALIASES[trimmed] ?? trimmed
}

export function areServiceTypesCompatible(type1?: string, type2?: string): boolean {
  if (!type1 || !type2) return true
  const t1 = type1.trim().toLowerCase()
  const t2 = type2.trim().toLowerCase()
  if (t1 === t2) return true

  const isPpc1 = PPC_SERVICE_TYPE_VARIANTS.some((v) => v.toLowerCase() === t1)
  const isPpc2 = PPC_SERVICE_TYPE_VARIANTS.some((v) => v.toLowerCase() === t2)

  return isPpc1 && isPpc2
}
