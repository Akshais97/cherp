import { Prisma } from '@prisma/client'

export type TemplatePreset = {
  name: string
  industry: string
  service_type: string
  description: string
  duration_months: number
  default_tasks: Prisma.InputJsonValue
  kpi_framework: Prisma.InputJsonValue
}

const monthOneTasks = (tasks: string[]): Prisma.InputJsonValue => ({
  month_1: tasks.map((title, index) => ({
    title,
    description: `Month 1 setup: ${title}`,
    priority: index < 2 ? 'high' : 'medium',
    due_offset_days: 3 + index * 3,
  })),
})

export const templatePresets: TemplatePreset[] = [
  {
    name: 'Real Estate Lead Generation',
    industry: 'Real Estate',
    service_type: 'Performance Marketing',
    description: 'Month 1 launch blueprint for property lead generation.',
    duration_months: 3,
    default_tasks: monthOneTasks([
      'Collect brand and property assets',
      'Create campaign landing page brief',
      'Configure Google and Meta ad accounts',
      'Launch lead capture campaigns',
      'Set weekly reporting baseline',
    ]),
    kpi_framework: { leads: 40, cpl_target: 1200, reporting_frequency: 'weekly' },
  },
  {
    name: 'SaaS Demand Generation',
    industry: 'SaaS',
    service_type: 'Demand Generation',
    description: 'Pipeline-building setup for SaaS acquisition teams.',
    duration_months: 3,
    default_tasks: monthOneTasks([
      'Define ICP and funnel stages',
      'Audit existing landing pages',
      'Prepare LinkedIn and Google campaigns',
      'Set conversion tracking',
      'Publish first performance report',
    ]),
    kpi_framework: { mqls: 25, trial_signups: 15, conversion_rate_target: 3 },
  },
  {
    name: 'E-commerce Growth Launch',
    industry: 'E-commerce',
    service_type: 'Growth Marketing',
    description: 'Revenue-focused setup for online stores.',
    duration_months: 3,
    default_tasks: monthOneTasks([
      'Audit product catalog and offers',
      'Set pixel and purchase tracking',
      'Prepare campaign creative matrix',
      'Launch acquisition campaigns',
      'Create revenue dashboard baseline',
    ]),
    kpi_framework: { roas_target: 3.5, revenue_target: 250000, cpa_target: 900 },
  },
  {
    name: 'Healthcare Local Acquisition',
    industry: 'Healthcare',
    service_type: 'Local Marketing',
    description: 'Patient inquiry setup with compliant messaging.',
    duration_months: 3,
    default_tasks: monthOneTasks([
      'Collect clinic service details',
      'Review compliance-safe ad copy',
      'Configure local search campaigns',
      'Set appointment inquiry tracking',
      'Create weekly inquiry report',
    ]),
    kpi_framework: { inquiries: 30, cost_per_inquiry: 800, calls_tracked: true },
  },
  {
    name: 'Education Enrollment Campaign',
    industry: 'Education',
    service_type: 'Enrollment Marketing',
    description: 'Admissions and lead funnel setup.',
    duration_months: 4,
    default_tasks: monthOneTasks([
      'Map programs and intake deadlines',
      'Prepare lead form questions',
      'Launch search and social campaigns',
      'Configure counselor handoff sheet',
      'Set enrollment KPI baseline',
    ]),
    kpi_framework: { applications: 20, inquiries: 80, cost_per_application: 1500 },
  },
  {
    name: 'Hospitality Booking Growth',
    industry: 'Hospitality',
    service_type: 'Booking Campaigns',
    description: 'Booking-focused marketing setup for venues and stays.',
    duration_months: 3,
    default_tasks: monthOneTasks([
      'Collect room or venue packages',
      'Create seasonal offer plan',
      'Set booking conversion tracking',
      'Launch paid social campaigns',
      'Prepare first booking report',
    ]),
    kpi_framework: { bookings: 35, occupancy_lift: 8, roas_target: 3 },
  },
  {
    name: 'Professional Services Pipeline',
    industry: 'Professional Services',
    service_type: 'Lead Generation',
    description: 'Qualified consultation pipeline setup.',
    duration_months: 3,
    default_tasks: monthOneTasks([
      'Define service packages',
      'Build qualification criteria',
      'Prepare consultation funnel',
      'Launch lead campaigns',
      'Set CRM handoff baseline',
    ]),
    kpi_framework: { consultations: 20, qualified_leads: 12, cpl_target: 1800 },
  },
]
