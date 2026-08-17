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
  {
    name: '360° Real Estate Marketing Retainer',
    industry: 'Real Estate',
    service_type: '360° Marketing Retainer',
    description: 'Full-funnel 360° marketing retainer covering positioning, launch campaigns, 25 monthly social deliverables, Meta/Google performance marketing, and ORM.',
    duration_months: 6,
    default_tasks: {
      month_1: [
        {
          title: 'Brand Communication Strategy & Positioning',
          description: 'Define category claim, pillars, messaging framework, visual direction, and campaign architecture.',
          priority: 'high',
          due_offset_days: 5,
          target_role: 'Brand Manager',
          subtasks: [
            {
              title: '1.1 Brand Positioning Document',
              description: 'Category claim, emotional & rational pillars, tone guidelines.',
              priority: 'high',
              due_offset_days: 2,
              target_role: 'Brand Manager',
              checklist: [
                { text: 'Define category claim & brand promise' },
                { text: 'Detail emotional + rational pillars' },
                { text: 'Set tone of voice guidelines across channels' }
              ]
            },
            {
              title: '1.2 Target Audience Cohort Mapping',
              description: 'HNI buyer, investor, and family upgrader psychographic & demographic matrices.',
              priority: 'high',
              due_offset_days: 4,
              target_role: 'Brand Manager',
              checklist: [
                { text: 'Map HNI buyer cohort characteristics' },
                { text: 'Define investor purchaser parameters' },
                { text: 'Draft family upgrader cohort matrix' }
              ]
            },
            {
              title: '1.3 Master Messaging & Tagline Framework',
              description: 'Core tagline, campaign line, concept, location, investment, and lifestyle pillars.',
              priority: 'high',
              due_offset_days: 5,
              target_role: 'Content Writer',
              checklist: [
                { text: 'Draft core tagline & campaign line options' },
                { text: 'Finalize concept, location, investment & lifestyle copy pillars' }
              ]
            },
            {
              title: '1.4 Visual Identity Direction & Mood Board',
              description: 'Greek / Stack Villa aesthetic, color palette, typography direction.',
              priority: 'medium',
              due_offset_days: 7,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Assemble Greek / Stack Villa visual mood board' },
                { text: 'Select project color palette & typography direction' }
              ]
            },
            {
              title: '1.5 Competitive Intelligence Brief',
              description: 'North BLR market scan, competitor positioning & pricing review.',
              priority: 'medium',
              due_offset_days: 8,
              target_role: 'Brand Manager',
              checklist: [
                { text: 'Conduct North BLR market scan' },
                { text: 'Analyze 5 key competitor positioning & pricing frameworks' }
              ]
            },
            {
              title: '1.6 Campaign Architecture Document',
              description: 'Full 6-phase campaign map, milestone triggers, and go/no-go criteria.',
              priority: 'high',
              due_offset_days: 10,
              target_role: 'Project Manager',
              checklist: [
                { text: 'Draft 6-phase campaign map' },
                { text: 'Define phase gate triggers and go/no-go criteria' }
              ]
            }
          ]
        },
        {
          title: 'Teaser, Pre-Launch & Launch Campaigns',
          description: 'Plan and produce video scripts, master creative sets, ad copy bank, and phase execution.',
          priority: 'high',
          due_offset_days: 16,
          target_role: 'Project Manager',
          subtasks: [
            {
              title: '2.1 Phase 1 Teaser Concept Execution',
              description: 'Concept selling on Stack Villa format; project name withheld.',
              priority: 'high',
              due_offset_days: 11,
              target_role: 'Brand Manager',
              checklist: [
                { text: 'Finalize Stack Villa curiosity teaser concept' },
                { text: 'Ensure project name is strictly withheld' }
              ]
            },
            {
              title: '2.2 Phase 2 Pre-Launch & EOI Collection Plan',
              description: 'USP, location & investment conviction messaging; EOI collection begins.',
              priority: 'high',
              due_offset_days: 13,
              target_role: 'Brand Manager',
              checklist: [
                { text: 'Prepare pre-launch conviction messaging' },
                { text: 'Set up EOI collection mechanism' }
              ]
            },
            {
              title: '2.3 Phase 3 Grand Launch Blitz',
              description: 'Full name reveal, creative blitz across channels, price escalation ladder live.',
              priority: 'high',
              due_offset_days: 15,
              target_role: 'Brand Manager',
              checklist: [
                { text: 'Prepare full name reveal collateral' },
                { text: 'Activate price escalation ladder' }
              ]
            },
            {
              title: '2.4 Master Brand Video & Teaser Series Production',
              description: '60-90s master film script + 3x 30-45s Teaser & 3x 30-45s Pre-Launch video scripts.',
              priority: 'high',
              due_offset_days: 14,
              target_role: 'Content Writer',
              checklist: [
                { text: 'Write 60-90s master brand film script' },
                { text: 'Write 3x 30-45s Teaser video scripts' },
                { text: 'Write 3x 30-45s Pre-Launch video scripts' }
              ]
            },
            {
              title: '2.5 Master Creative Set & Ad Copy Bank',
              description: 'Key visual, launch poster, digital static set, Meta/Google ad copy bank & hooks.',
              priority: 'medium',
              due_offset_days: 16,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Design master key visual & launch poster' },
                { text: 'Write Meta & Google ad copy bank with CTA hooks' }
              ]
            }
          ]
        },
        {
          title: 'Social Media Strategy, Planning & Content Production',
          description: '25 monthly social deliverables: 10 Reels, 10 Statics, 5 Carousels, 2-week advance content calendar.',
          priority: 'high',
          due_offset_days: 24,
          target_role: 'Social Media Manager',
          subtasks: [
            {
              title: '3.1 Short-Form Video Production (10 Reels/mo)',
              description: '10 Reels / short-form videos (15-60s vertical) for IG & FB.',
              priority: 'high',
              due_offset_days: 20,
              target_role: 'Content Writer',
              checklist: [
                { text: 'Write 10 short-form video scripts & concepts' },
                { text: 'Edit vertical video assets for IG & FB Reels' }
              ]
            },
            {
              title: '3.2 Static Creative Production (10 Statics/mo)',
              description: '10 Static posts / month (Square + portrait, Greek aesthetic).',
              priority: 'medium',
              due_offset_days: 22,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Design 10 static graphics maintaining Greek aesthetic' },
                { text: 'Format square (1:1) and portrait (4:5) variants' }
              ]
            },
            {
              title: '3.3 Carousel Creative Production (5 Carousels/mo)',
              description: '5 Carousels / month (3-6 slides, floor plans, location advantage).',
              priority: 'medium',
              due_offset_days: 24,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Design 5 swipeable carousels (3-6 slides each)' },
                { text: 'Include floor plan walkthroughs & location highlights' }
              ]
            },
            {
              title: '3.4 Content Calendar & Monthly Social Analytics',
              description: 'Approve calendar 2 weeks in advance; monthly social performance report.',
              priority: 'medium',
              due_offset_days: 25,
              target_role: 'Social Media Manager',
              checklist: [
                { text: 'Schedule 25 posts 2 weeks in advance' },
                { text: 'Generate monthly social analytics report' }
              ]
            }
          ]
        },
        {
          title: 'Media Strategy: Performance Marketing & Branding',
          description: 'Ad infrastructure setup, Pixel/GA4/UTM, Meta CTWA, Google Search/Display/YouTube, weekly CPL tracking.',
          priority: 'high',
          due_offset_days: 28,
          target_role: 'Performance Marketer',
          subtasks: [
            {
              title: '4.1 Campaign Setup & Infrastructure',
              description: 'Ad account audit, Pixel, GA4, UTM architecture, and conversion tracking.',
              priority: 'high',
              due_offset_days: 12,
              target_role: 'Performance Marketer',
              checklist: [
                { text: 'Audit Meta & Google ad accounts' },
                { text: 'Install Meta Pixel & GA4 conversion events' },
                { text: 'Define UTM tag architecture' }
              ]
            },
            {
              title: '4.2 Meta & Google Paid Campaigns Launch',
              description: 'CTWA, Advantage+, Search, Display & YouTube pre-roll campaigns.',
              priority: 'high',
              due_offset_days: 25,
              target_role: 'Performance Marketer',
              checklist: [
                { text: 'Build Meta CTWA & Advantage+ campaign structures' },
                { text: 'Launch Google Search high-intent & YouTube pre-roll ads' }
              ]
            },
            {
              title: '4.3 Weekly Media Optimisation & Reporting',
              description: 'CPL tracking, creative rotation, budget reallocation, and weekly analytics.',
              priority: 'medium',
              due_offset_days: 28,
              target_role: 'Performance Marketer',
              checklist: [
                { text: 'Track weekly CPL targets' },
                { text: 'Rotate creatives and reallocate budget to top performers' }
              ]
            }
          ]
        },
        {
          title: 'Project Collateral Suite & Corporate Identity',
          description: 'Logo options, brochure, opportunity document, CP document, corporate stationery, booking kit.',
          priority: 'medium',
          due_offset_days: 20,
          target_role: 'Graphic Designer',
          subtasks: [
            {
              title: '5.1 Logo Design & Brand Identity Options',
              description: 'Design 2 logo options aligned to visual guidelines.',
              priority: 'medium',
              due_offset_days: 14,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Develop 2 logo design options' },
                { text: 'Present branding guidelines integration' }
              ]
            },
            {
              title: '5.2 Master Brochure & Opportunity Document',
              description: 'Master brochure (36p max), Opportunity doc (12p max), CP Document.',
              priority: 'medium',
              due_offset_days: 16,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Design master brochure (36 pages max)' },
                { text: 'Design opportunity document (12 pages max)' },
                { text: 'Design Channel Partner (CP) document' }
              ]
            },
            {
              title: '5.3 Corporate Identity Suite Rollout',
              description: 'Stationery set, presentation deck template, booking kit, email signature.',
              priority: 'low',
              due_offset_days: 18,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Design corporate stationery set & visiting cards' },
                { text: 'Create corporate presentation deck template' },
                { text: 'Design booking kit (folder, form, receipt, ack letter)' }
              ]
            }
          ]
        },
        {
          title: 'Online Reputation Management & Influencer Strategy',
          description: 'Monitor comments/DMs across platforms, SLA response in brand tone, Google review management, influencer scripts.',
          priority: 'medium',
          due_offset_days: 28,
          target_role: 'Social Media Manager',
          subtasks: [
            {
              title: '6.1 ORM Monitoring & Response Execution',
              description: 'Monitor comments/DMs on IG, FB, YT, LinkedIn; respond within SLA in brand tone.',
              priority: 'medium',
              due_offset_days: 26,
              target_role: 'Social Media Manager',
              checklist: [
                { text: 'Set up social monitoring tools across IG, FB, YT, LinkedIn' },
                { text: 'Draft approved brand tone response templates' }
              ]
            },
            {
              title: '6.2 Review Management & Negative Sentiment Escalation',
              description: 'Track Google & RE portal reviews; escalate complaints to Client.',
              priority: 'medium',
              due_offset_days: 28,
              target_role: 'Social Media Manager',
              checklist: [
                { text: 'Manage Google & RE portal review responses' },
                { text: 'Set up negative sentiment escalation alerts' }
              ]
            },
            {
              title: '6.3 Influencer Script Writing & Creative Direction',
              description: 'Ideate angles and write scripts for influencer content across campaign phases.',
              priority: 'medium',
              due_offset_days: 20,
              target_role: 'Content Writer',
              checklist: [
                { text: 'Develop influencer campaign angles per phase' },
                { text: 'Write scripts & creative direction notes for influencers' }
              ]
            }
          ]
        }
      ]
    },
    kpi_framework: {
      social_deliverables_monthly: 25,
      reels_count_monthly: 10,
      statics_count_monthly: 10,
      carousels_count_monthly: 5,
      orm_turnaround_sla_hours: 2,
      primary_kpi: 'qualified_site_visits',
      secondary_kpi: 'cost_per_lead',
      reporting_frequency: 'weekly',
    },
  },
  {
    name: 'Real Estate Brand Repositioning, Launch & ORM SOW Template',
    industry: 'Real Estate',
    service_type: 'Brand Repositioning & ORM',
    description: 'Comprehensive 360° retainer covering brand repositioning, 15 organic posts & 5 videos/mo, PPC/SEM campaigns, technical & off-page SEO, 3 blogs/mo, CRM & marketing automation, ORM management, and Rebuild Trust sentiment recovery project.',
    duration_months: 6,
    default_tasks: {
      month_1: [
        {
          title: 'Brand Strategy & Positioning Redefinition',
          description: 'Redefine market position, conduct competitor SWOT analysis, develop manifesto, guidelines, and 12-month marketing calendar.',
          priority: 'high',
          due_offset_days: 7,
          target_role: 'Brand Manager',
          subtasks: [
            {
              title: '1.1 Brand Positioning & Competitor SWOT Analysis',
              description: 'Redefine market position & conduct SWOT analysis of 5-7 key competitors.',
              priority: 'high',
              due_offset_days: 2,
              target_role: 'Brand Manager',
              checklist: [
                { text: 'Conduct SWOT analysis of 5-7 key competitors' },
                { text: 'Redefine target market positioning statement' }
              ]
            },
            {
              title: '1.2 Brand Manifesto & Guidelines Document',
              description: 'Develop Brand Manifesto, Messaging Pillars, brand voice, and Brand Guideline Document.',
              priority: 'high',
              due_offset_days: 4,
              target_role: 'Brand Manager',
              checklist: [
                { text: 'Draft Brand Manifesto & Messaging Pillars' },
                { text: 'Compile Brand Guideline Document' }
              ]
            },
            {
              title: '1.3 12-Month Marketing Calendar & Channel Plan',
              description: 'Develop 12-month calendar mapping offline, social, digital, and ATL/BTL campaign themes.',
              priority: 'medium',
              due_offset_days: 7,
              target_role: 'Project Manager',
              checklist: [
                { text: 'Map 12-month marketing campaign themes' },
                { text: 'Define cross-channel marketing plan' }
              ]
            }
          ]
        },
        {
          title: 'Paid Performance Marketing & Google SEM Setup',
          description: 'Set up ad accounts across digital channels, Meta & Google PPC campaigns, keyword research, text/banner ad creation.',
          priority: 'high',
          due_offset_days: 12,
          target_role: 'Performance Marketer',
          subtasks: [
            {
              title: '2.1 Ad Accounts Creation & Paid PPC Campaign Setup',
              description: 'Ad account creation, Meta & Google PPC setup for Lead Gen, Display, YT & LinkedIn ads.',
              priority: 'high',
              due_offset_days: 10,
              target_role: 'Performance Marketer',
              checklist: [
                { text: 'Create ad accounts across digital platforms' },
                { text: 'Configure Lead Gen, Display & LinkedIn campaign structures' }
              ]
            },
            {
              title: '2.2 Google SEM Setup, Keyword Research & Ad Groups',
              description: 'Keyword research via AdWords, Search & Display campaigns, Text & Banner ad setup.',
              priority: 'high',
              due_offset_days: 12,
              target_role: 'Performance Marketer',
              checklist: [
                { text: 'Conduct AdWords keyword research' },
                { text: 'Build Search & Display ad groups with sitelinks & extensions' }
              ]
            }
          ]
        },
        {
          title: 'Technical SEO & Content Marketing (3 Blogs/mo)',
          description: 'On-page SEO audit, sitemap, robots.txt, Google Analytics/Webmaster setup, 3 SEO blogs/mo, off-page activities.',
          priority: 'medium',
          due_offset_days: 24,
          target_role: 'SEO Specialist',
          subtasks: [
            {
              title: '3.1 Website Technical SEO Audit & GA/GMB Setup',
              description: 'Website analysis, Meta tags, sitemap, robots.txt, Google Analytics & Webmaster setup.',
              priority: 'medium',
              due_offset_days: 14,
              target_role: 'SEO Specialist',
              checklist: [
                { text: 'Audit Meta tags, sitemap & robots.txt' },
                { text: 'Configure GA4, Search Console & Google My Business' }
              ]
            },
            {
              title: '3.2 SEO Content Marketing & Blog Publishing (3 Blogs/mo)',
              description: 'Write, optimize, design graphics, and publish 3 SEO blogs on CMS with social sharing.',
              priority: 'medium',
              due_offset_days: 24,
              target_role: 'Content Writer',
              checklist: [
                { text: 'Write and optimize 3 SEO blog posts' },
                { text: 'Design blog graphics & publish on CMS' },
                { text: 'Execute 13 off-page SEO distribution activities' }
              ]
            }
          ]
        },
        {
          title: 'CRM Integration & Marketing Automation Sequences',
          description: 'Configure CRM deal stages, user roles, lead source sync, automated email & WhatsApp nurture flows.',
          priority: 'high',
          due_offset_days: 16,
          target_role: 'CRM Specialist',
          subtasks: [
            {
              title: '4.1 CRM Dashboards & Lead Source Integration',
              description: 'Configure CRM deal stages, user roles, data fields, and connect all lead sources.',
              priority: 'high',
              due_offset_days: 15,
              target_role: 'CRM Specialist',
              checklist: [
                { text: 'Set up CRM deal stages & user role permissions' },
                { text: 'Integrate all paid & organic lead sources into CRM' }
              ]
            },
            {
              title: '4.2 Automated Email & WhatsApp Sequences Setup',
              description: 'Build automated email and WhatsApp nurture sequences based on user behavior.',
              priority: 'medium',
              due_offset_days: 16,
              target_role: 'CRM Specialist',
              checklist: [
                { text: 'Build automated lead nurture email sequences' },
                { text: 'Configure WhatsApp broadcast & auto-reply flows' }
              ]
            }
          ]
        },
        {
          title: 'Social Media Organic Production & Launch Communications',
          description: '15 organic posts & 5 videos/mo across IG/FB/LinkedIn/YT, project launch communication & site branding.',
          priority: 'high',
          due_offset_days: 22,
          target_role: 'Graphic Designer',
          subtasks: [
            {
              title: '5.1 Social Media Organic Production (15 Posts + 5 Videos/mo)',
              description: 'Publish 15 organic posts & 5 videos across Instagram, Facebook, LinkedIn, YouTube.',
              priority: 'high',
              due_offset_days: 22,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Design 15 organic static posts for social channels' },
                { text: 'Produce 5 short-form videos/reels' }
              ]
            },
            {
              title: '5.2 Project Launch Communication & Collaterals',
              description: 'Project communication strategy, digital ads, direction boards, site branding & emailers.',
              priority: 'medium',
              due_offset_days: 20,
              target_role: 'Graphic Designer',
              checklist: [
                { text: 'Design direction boards & site branding visuals' },
                { text: 'Create launch digital ads & promotional emailers' }
              ]
            }
          ]
        },
        {
          title: 'Online Reputation Management & Sentiment Recovery',
          description: 'ORM brand mention monitoring setup, response templates, Rebuild Trust project kickoff, daily task reporting.',
          priority: 'high',
          due_offset_days: 28,
          target_role: 'Social Media Manager',
          subtasks: [
            {
              title: '6.1 ORM Setup, FAQs & Response Templates',
              description: 'Brand mention monitoring setup, FAQs, response templates, and escalation flows.',
              priority: 'high',
              due_offset_days: 18,
              target_role: 'Social Media Manager',
              checklist: [
                { text: 'Configure brand mention monitoring across Google & social' },
                { text: 'Create approved FAQs & response templates' }
              ]
            },
            {
              title: '6.2 "Rebuild Trust" Project Kickoff & Sentiment Dashboard',
              description: 'Deploy Sentiment Dashboard, initiate Trust Circles and customer engagement flow.',
              priority: 'high',
              due_offset_days: 25,
              target_role: 'Project Manager',
              checklist: [
                { text: 'Deploy Sentiment Dashboard' },
                { text: 'Coordinate Trust Circles closed-group customer meetings' },
                { text: 'Initiate Storybank development (100+ transformation stories)' }
              ]
            },
            {
              title: '6.3 Daily Task Reporting & Performance Governance Review',
              description: 'Setup Daily Task Reports, weekly/monthly performance review cadences & 1-year roadmap.',
              priority: 'medium',
              due_offset_days: 28,
              target_role: 'Project Manager',
              checklist: [
                { text: 'Setup Daily Task Reporting cadence' },
                { text: 'Establish weekly & monthly performance governance reviews' }
              ]
            }
          ]
        }
      ]
    },
    kpi_framework: {
      organic_posts_monthly: 15,
      videos_monthly: 5,
      blogs_monthly: 3,
      performance_incentive_max_monthly: 200000,
      media_spend_agency_fee_percent: 8,
      primary_kpi: 'qualified_leads',
      secondary_kpi: 'orm_sentiment_score',
      reporting_frequency: 'weekly',
    },
  },
]

