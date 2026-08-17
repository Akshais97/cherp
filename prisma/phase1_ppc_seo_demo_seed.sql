set search_path to erp, public;

do $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_ppc_template_id uuid;
  v_seo_template_id uuid;
  v_ppc_client_id uuid;
  v_seo_client_id uuid;
  v_ppc_workflow_id uuid;
  v_seo_workflow_id uuid;
begin
  select id into v_tenant_id
  from erp.tenants
  order by created_at asc
  limit 1;

  select id into v_user_id
  from erp.users
  where tenant_id = v_tenant_id and is_active = true
  order by created_at asc
  limit 1;

  if v_tenant_id is null or v_user_id is null then
    raise exception 'Seed requires at least one erp.tenants row and one active erp.users row.';
  end if;

  insert into erp.scope_templates (
    tenant_id,
    name,
    industry,
    service_type,
    description,
    duration_months,
    default_tasks,
    kpi_framework,
    created_by
  )
  values (
    v_tenant_id,
    'Demo Real Estate PPC Launch',
    'Real Estate',
    'PPC',
    'Demo PPC scope for testing client onboarding, workflow, task, and dashboard data flow.',
    3,
    '{
      "month_1": [
        {"title": "Audit landing page conversion path", "description": "Check form, CTA, offer, and mobile speed.", "priority": "high", "due_offset_days": 1},
        {"title": "Build PPC campaign structure", "description": "Create campaign, ad group, keyword, and negative keyword map.", "priority": "high", "due_offset_days": 3},
        {"title": "Launch tracking QA", "description": "Verify pixel, conversions, UTMs, and lead routing.", "priority": "medium", "due_offset_days": 5}
      ]
    }'::jsonb,
    '{"primary_kpi": "qualified_leads", "secondary_kpi": "cost_per_lead", "reporting": "weekly"}'::jsonb,
    v_user_id
  )
  on conflict (tenant_id, industry, service_type)
  do update set
    name = excluded.name,
    description = excluded.description,
    duration_months = excluded.duration_months,
    default_tasks = excluded.default_tasks,
    kpi_framework = excluded.kpi_framework,
    is_active = true,
    updated_at = now()
  returning id into v_ppc_template_id;

  insert into erp.scope_templates (
    tenant_id,
    name,
    industry,
    service_type,
    description,
    duration_months,
    default_tasks,
    kpi_framework,
    created_by
  )
  values (
    v_tenant_id,
    '360° Real Estate Marketing Retainer',
    'Real Estate',
    '360° Marketing Retainer',
    'Full-funnel 360° marketing retainer covering positioning, launch campaigns, 25 monthly social deliverables, Meta/Google performance marketing, and ORM.',
    6,
    '{
      "month_1": [
        {"title": "Brand Positioning & Tone of Voice Document", "description": "Category claim, emotional/rational pillars, tone guidelines.", "priority": "high", "due_offset_days": 2},
        {"title": "Target Audience Cohort Mapping", "description": "HNI, investor, and family upgrader psychographic & demographic matrices.", "priority": "high", "due_offset_days": 4},
        {"title": "Master Messaging & Tagline Framework", "description": "Core tagline, concept, location, investment, and lifestyle pillars.", "priority": "high", "due_offset_days": 5},
        {"title": "Visual Identity Direction & Mood Board", "description": "Greek / Stack Villa aesthetic, color palette, typography direction.", "priority": "medium", "due_offset_days": 7},
        {"title": "Competitive Intelligence Brief", "description": "North BLR market scan, competitor positioning & pricing review.", "priority": "medium", "due_offset_days": 8},
        {"title": "Campaign Architecture & Phase Gate Map", "description": "Full 6-phase campaign map, milestone triggers, and go/no-go criteria.", "priority": "high", "due_offset_days": 10},
        {"title": "Ad Account & Analytics Infrastructure Setup", "description": "Ad account audit, Pixel, GA4, UTM architecture, and conversion tracking.", "priority": "high", "due_offset_days": 12},
        {"title": "Master Creative Set & Ad Copy Bank", "description": "Launch key visual, posters, digital static set, Meta/Google copy bank & hooks.", "priority": "medium", "due_offset_days": 14},
        {"title": "Project Collateral Suite & Brochure Design", "description": "Brochure (36p max), Opportunity doc (12p max), Logo options, CP Document.", "priority": "medium", "due_offset_days": 16},
        {"title": "Corporate Identity Suite Rollout", "description": "Stationery set, presentation deck template, booking kit, email signature.", "priority": "low", "due_offset_days": 18},
        {"title": "Short-Form Video Production (10 Reels/mo)", "description": "10 Reels / short-form videos (15-60s vertical) for Instagram & Facebook.", "priority": "high", "due_offset_days": 20},
        {"title": "Static Creative Production (10 Statics/mo)", "description": "10 Static posts / month (Square + portrait, Greek aesthetic).", "priority": "medium", "due_offset_days": 22},
        {"title": "Carousel Creative Production (5 Carousels/mo)", "description": "5 Carousels / month (3-6 slides, floor plans, location advantage).", "priority": "medium", "due_offset_days": 24},
        {"title": "Meta & Google Paid Campaign Launch", "description": "CTWA, Advantage+, Search, Display & YouTube pre-roll campaigns.", "priority": "high", "due_offset_days": 25},
        {"title": "Weekly Media Optimisation & ORM Reporting", "description": "CPL tracking, creative rotation, comment/DM ORM, monthly analytics report.", "priority": "medium", "due_offset_days": 28}
      ],
      "setup_tasks": [
        "Brand Positioning Document",
        "Target Audience Mapping",
        "Master Messaging Framework",
        "Visual Identity Direction",
        "Competitive Intelligence Brief",
        "Campaign Architecture Document",
        "Ad Account & Tracking Setup",
        "Master Creative Set & Copy Bank",
        "Project Collateral Suite",
        "Corporate Branding & Identity Suite"
      ],
      "monthly_retainer_tasks": [
        "10 Short-Form Reels / Videos",
        "10 Static Posts",
        "5 Swipeable Carousels",
        "Meta Ads Campaign Execution",
        "Google & YouTube Ads Campaign Execution",
        "Weekly Media Optimisation",
        "ORM Monitoring & Response Execution",
        "Monthly Analytics & ORM Sentiment Report"
      ],
      "add_on_services": [
        "Cinematic Project Walkthrough Video",
        "3D Floor Plan Walkthrough Animation",
        "Email & WhatsApp Promotional Engine",
        "Lead Generation Landing Page",
        "Project Microsite"
      ]
    }'::jsonb,
    '{"social_deliverables_monthly": 25, "reels_count_monthly": 10, "statics_count_monthly": 10, "carousels_count_monthly": 5, "orm_turnaround_sla_hours": 2, "primary_kpi": "qualified_site_visits", "secondary_kpi": "cost_per_lead", "reporting": "weekly"}'::jsonb,
    v_user_id
  )
  on conflict (tenant_id, industry, service_type)
  do update set
    name = excluded.name,
    description = excluded.description,
    duration_months = excluded.duration_months,
    default_tasks = excluded.default_tasks,
    kpi_framework = excluded.kpi_framework,
    is_active = true,
    updated_at = now();

  insert into erp.scope_templates (
    tenant_id,
    name,
    industry,
    service_type,
    description,
    duration_months,
    default_tasks,
    kpi_framework,
    created_by
  )
  values (
    v_tenant_id,
    'Real Estate Brand Repositioning, Launch & ORM SOW Template',
    'Real Estate',
    'Brand Repositioning & ORM',
    'Comprehensive 360° retainer covering brand repositioning, 15 organic posts & 5 videos/mo, PPC/SEM campaigns, technical & off-page SEO, 3 blogs/mo, CRM & marketing automation, ORM management, and Rebuild Trust sentiment recovery project.',
    6,
    '{
      "month_1": [
        {"title": "Brand Positioning & Competitor SWOT Analysis", "description": "Redefine market position & conduct SWOT analysis of 5-7 key competitors.", "priority": "high", "due_offset_days": 2},
        {"title": "Brand Manifesto & Guidelines Document", "description": "Develop Brand Manifesto, Messaging Pillars, brand voice, and Brand Guideline Document.", "priority": "high", "due_offset_days": 4},
        {"title": "Brand Communication Strategy & Master Creative Concept", "description": "Master creative concept, monthly content plan across Brand, Product, and Community.", "priority": "high", "due_offset_days": 5},
        {"title": "12-Month Marketing Calendar & Channel Plan", "description": "Develop 12-month calendar mapping offline, social, digital, and ATL/BTL campaign themes.", "priority": "medium", "due_offset_days": 7},
        {"title": "Ad Accounts Creation & Paid PPC Campaign Setup", "description": "Ad account creation, Meta & Google PPC setup for Lead Gen, Display, YT & LinkedIn ads.", "priority": "high", "due_offset_days": 10},
        {"title": "Google SEM Setup, Keyword Research & Ad Groups", "description": "Keyword research via AdWords, Search & Display campaigns, Text & Banner ad setup.", "priority": "high", "due_offset_days": 12},
        {"title": "Website Technical SEO Audit & GA/GMB Setup", "description": "Website analysis, Meta tags, sitemap, robots.txt, Google Analytics & Webmaster setup.", "priority": "medium", "due_offset_days": 14},
        {"title": "CRM Dashboards & Lead Source Integration", "description": "Configure CRM deal stages, user roles, data fields, and connect all lead sources.", "priority": "high", "due_offset_days": 15},
        {"title": "Automated Email & WhatsApp Sequences Setup", "description": "Build automated email and WhatsApp nurture sequences based on user behavior.", "priority": "medium", "due_offset_days": 16},
        {"title": "ORM Setup, FAQs & Response Templates", "description": "Brand mention monitoring setup, FAQs, response templates, and escalation flows.", "priority": "high", "due_offset_days": 18},
        {"title": "Project Launch Communication & Collaterals", "description": "Project communication strategy, digital ads, direction boards, site branding & emailers.", "priority": "medium", "due_offset_days": 20},
        {"title": "Social Media Organic Production (15 Posts + 5 Videos/mo)", "description": "Publish 15 organic posts & 5 videos across Instagram, Facebook, LinkedIn, YouTube.", "priority": "high", "due_offset_days": 22},
        {"title": "SEO Content Marketing (3 Blogs/mo)", "description": "Write, optimize, design graphics, and publish 3 SEO blogs on CMS with social sharing.", "priority": "medium", "due_offset_days": 24},
        {"title": "\"Rebuild Trust\" Project Kickoff & Sentiment Dashboard", "description": "Deploy Sentiment Dashboard, initiate Trust Circles and customer engagement flow.", "priority": "high", "due_offset_days": 25},
        {"title": "Daily Task Reporting & Performance Governance Review", "description": "Setup Daily Task Reports, weekly/monthly performance review cadences & 1-year roadmap.", "priority": "medium", "due_offset_days": 28}
      ],
      "setup_tasks": [
        "1.1 Brand Positioning Redefinition & Audience Segmentation",
        "1.2 SWOT Analysis of 5-7 Competitors",
        "1.3 Brand Manifesto, Messaging Pillars & Brand Messaging",
        "1.4 Brand Guideline Document",
        "2.1 Brand Communication Strategy & Master Creative Concept",
        "2.2 Monthly Content Plan (Brand, Product, Community)",
        "2.3 Collateral Development (Hoardings, Outdoor, Social, Emailers, Videos)",
        "3.1 Handle Optimization (Bio, highlights, links)",
        "3.2 Hashtag Strategy & Cross-Posting Plan",
        "3.3 12-Month Marketing Calendar Development",
        "4.1 Ad Accounts Creation across Digital Channels",
        "5.1 Google Campaigns Setup & Keyword Research",
        "5.2 Text & Banner Ad Creation, Sitelinks & Extension Setup",
        "7.1 Website Analysis & On-Page SEO Optimization",
        "7.2 Sitemap Implementation & Robots.txt Updating",
        "7.3 Google Analytics & Google Webmaster Setup",
        "9.1 Automated Email & WhatsApp Sequences Setup",
        "9.2 CRM Dashboards, Deal Stages & User Roles Configuration",
        "9.3 Lead Source Integration into CRM",
        "10.1 ORM Brand Mention Monitoring Setup",
        "10.2 FAQs & Response Templates Creation",
        "11.1 Project Launch Communication Strategy & Artworks",
        "11.2 Direction Boards & Site Branding Design",
        "12.1 Dedicated Account Manager Assignment & Onboarding",
        "12.2 1-Year Actionable Marketing Roadmap Development"
      ],
      "monthly_retainer_tasks": [
        "3.1 Social Media Organic Posts (15 Organic Posts/month)",
        "3.2 Social Media Video Deliverables (5 Videos/month)",
        "3.3 Publishing & Community Response Management",
        "3.4 Follower Engagement & Cross-Posting",
        "4.1 PPC Campaign Execution (1 Digital Campaign/month)",
        "4.2 Paid Campaign Types (Lead Gen, Display, YT, LinkedIn, LP, GMB, Programmatic)",
        "5.1 SEM Google Search & Display Campaigns Execution",
        "5.2 SEM Bid Management, A/B Testing & Geo/Interest Targeting",
        "6.1 Daily Task Report Generation",
        "6.2 SEO, ORM, Social & Performance Campaign Reporting",
        "7.1 Off-Page SEO Activities (13 activities: Bookmarking, Classifieds, Articles, Blogs, PRs, PDFs, Images, Videos, Comments, Forums, Business Listings, Reviews, Quora)",
        "8.1 Content Marketing Blog Writing & CMS Publishing (3 Blogs/month)",
        "8.2 Blog Graphics Creation & Social Media Sharing",
        "8.3 Blog Comment Engagement & Backlink Building",
        "9.1 Weekly/Monthly Newsletters & Drip Campaigns Strategy",
        "9.2 Regular CRM Data Deduplication, Tagging & Syncing",
        "9.3 Real-Time Lead Source & Campaign ROI Reporting",
        "10.1 ORM Brand Mention Monitoring (Google Reviews & Social Media)",
        "10.2 Customer Review & DM Responses in Brand Tone (Brand Approval)",
        "10.3 Negative Review Escalation & Resolution Coordination",
        "10.4 Monthly ORM Sentiment & Insights Reporting",
        "12.1 Weekly & Monthly Performance Governance Reviews"
      ],
      "rebuild_trust_project": [
        "13.1 \"Rebuild Trust\" 6-Month Project Execution (Customer Engagement & Sentiment Recovery)",
        "14.1 \"Trust Circles\" Closed-Group Customer Meetings Coordination",
        "14.2 Home Visits & Community Meetings for High-Priority Customers",
        "14.3 Issue Documentation & Escalation Flow with Client CRM Team",
        "15.1 Sentiment Dashboard Deployment & Management",
        "15.2 Weekly CX Impact & Campaign Progress Reporting",
        "15.3 \"Storybank\" Development (100+ Documented Transformation Stories)"
      ],
      "add_on_services": [
        "17.1 Media Spends (Paid directly to publications by Client + 8% agency fee)",
        "17.2 Video & Photo Production Costs (Director, equipment, talent)",
        "17.3 Mainline & OOH Printing, Mounting & Renting Costs",
        "17.4 Software & Tool Licensing Fees",
        "18.1 Website & App Development (Full-cycle design & coding)",
        "18.2 Landing Page Development (Full-cycle design & coding)",
        "19.1 On-Ground Physical Execution by Agency Employees",
        "20.1 Large-Scale PR Campaign Execution Spends & Media Outreach"
      ],
      "commercial_notes": [
        "Retainer fee: Rs. 4,00,000 + GST per month towards Schedule 1 Scope of Work A",
        "Performance incentive: Up to ₹2,00,000 per month tied to KPIs agreed within 30 days",
        "Media spend commission: 8% + GST applicable on media spends",
        "Media spends paid directly to publications by Client",
        "Scope of Work C items quoted separately and billed as actuals"
      ]
    }'::jsonb,
    '{"organic_posts_monthly": 15, "videos_monthly": 5, "blogs_monthly": 3, "performance_incentive_max_monthly": 200000, "media_spend_agency_fee_percent": 8, "primary_kpi": "qualified_leads", "secondary_kpi": "orm_sentiment_score", "reporting": "weekly"}'::jsonb,
    v_user_id
  )
  on conflict (tenant_id, industry, service_type)
  do update set
    name = excluded.name,
    description = excluded.description,
    duration_months = excluded.duration_months,
    default_tasks = excluded.default_tasks,
    kpi_framework = excluded.kpi_framework,
    is_active = true,
    updated_at = now();

  insert into erp.scope_templates (
    tenant_id,
    name,
    industry,
    service_type,
    description,
    duration_months,
    default_tasks,
    kpi_framework,
    created_by
  )
  values (
    v_tenant_id,
    'Demo Healthcare SEO Sprint',
    'Healthcare',
    'SEO',
    'Demo SEO scope for testing organic workflow and task execution.',
    3,
    '{
      "month_1": [
        {"title": "Technical SEO crawl", "description": "Review indexability, redirects, metadata, and page speed.", "priority": "high", "due_offset_days": 2},
        {"title": "Local SEO profile cleanup", "description": "Update GBP, NAP, categories, and appointment links.", "priority": "medium", "due_offset_days": 4},
        {"title": "Service-page keyword mapping", "description": "Map procedures/services to target pages and queries.", "priority": "medium", "due_offset_days": 6}
      ]
    }'::jsonb,
    '{"primary_kpi": "organic_appointments", "secondary_kpi": "local_pack_visibility", "reporting": "weekly"}'::jsonb,
    v_user_id
  )
  on conflict (tenant_id, industry, service_type)
  do update set
    name = excluded.name,
    description = excluded.description,
    duration_months = excluded.duration_months,
    default_tasks = excluded.default_tasks,
    kpi_framework = excluded.kpi_framework,
    is_active = true,
    updated_at = now()
  returning id into v_seo_template_id;

  select id into v_ppc_client_id
  from erp.clients
  where tenant_id = v_tenant_id and name = 'Demo PPC - Aster Realty'
  limit 1;

  if v_ppc_client_id is null then
    insert into erp.clients (
      tenant_id,
      name,
      industry,
      service_type,
      contact_name,
      contact_email,
      status,
      monthly_retainer,
      currency,
      contract_duration,
      contract_start,
      contract_end,
      scope_template_id,
      retainer_hours,
      created_by
    )
    values (
      v_tenant_id,
      'Demo PPC - Aster Realty',
      'Real Estate',
      'PPC',
      'Aster Marketing Lead',
      'ppc-demo@example.com',
      'active',
      75000,
      'INR',
      3,
      current_date,
      (current_date + interval '3 months')::date,
      v_ppc_template_id,
      40,
      v_user_id
    )
    returning id into v_ppc_client_id;
  end if;

  select id into v_seo_client_id
  from erp.clients
  where tenant_id = v_tenant_id and name = 'Demo SEO - Niva Clinic'
  limit 1;

  if v_seo_client_id is null then
    insert into erp.clients (
      tenant_id,
      name,
      industry,
      service_type,
      contact_name,
      contact_email,
      status,
      monthly_retainer,
      currency,
      contract_duration,
      contract_start,
      contract_end,
      scope_template_id,
      retainer_hours,
      created_by
    )
    values (
      v_tenant_id,
      'Demo SEO - Niva Clinic',
      'Healthcare',
      'SEO',
      'Niva Operations Lead',
      'seo-demo@example.com',
      'active',
      55000,
      'INR',
      3,
      current_date,
      (current_date + interval '3 months')::date,
      v_seo_template_id,
      32,
      v_user_id
    )
    returning id into v_seo_client_id;
  end if;

  select id into v_ppc_workflow_id
  from erp.workflows
  where tenant_id = v_tenant_id and client_id = v_ppc_client_id and month_number = 1
  limit 1;

  if v_ppc_workflow_id is null then
    insert into erp.workflows (
      tenant_id,
      client_id,
      template_id,
      project_manager_id,
      title,
      status,
      month_number,
      completion_percentage,
      start_date,
      end_date,
      auto_generated
    )
    values (
      v_tenant_id,
      v_ppc_client_id,
      v_ppc_template_id,
      v_user_id,
      'Demo PPC - Aster Realty - Month 1 Workflow',
      'active',
      1,
      33.33,
      current_date,
      (current_date + interval '30 days')::date,
      true
    )
    returning id into v_ppc_workflow_id;
  end if;

  select id into v_seo_workflow_id
  from erp.workflows
  where tenant_id = v_tenant_id and client_id = v_seo_client_id and month_number = 1
  limit 1;

  if v_seo_workflow_id is null then
    insert into erp.workflows (
      tenant_id,
      client_id,
      template_id,
      project_manager_id,
      title,
      status,
      month_number,
      completion_percentage,
      start_date,
      end_date,
      auto_generated
    )
    values (
      v_tenant_id,
      v_seo_client_id,
      v_seo_template_id,
      v_user_id,
      'Demo SEO - Niva Clinic - Month 1 Workflow',
      'active',
      1,
      33.33,
      current_date,
      (current_date + interval '30 days')::date,
      true
    )
    returning id into v_seo_workflow_id;
  end if;

  insert into erp.tasks (
    tenant_id,
    workflow_id,
    assigned_to,
    completed_by,
    title,
    description,
    status,
    priority,
    sort_order,
    due_date,
    completed_at
  )
  select v_tenant_id, v_ppc_workflow_id, v_user_id, v_user_id, 'Audit landing page conversion path', 'Check form, CTA, offer, and mobile speed.', 'completed', 'high', 1, current_date + 1, now()
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_ppc_workflow_id and title = 'Audit landing page conversion path');

  insert into erp.tasks (tenant_id, workflow_id, assigned_to, title, description, status, priority, sort_order, due_date)
  select v_tenant_id, v_ppc_workflow_id, v_user_id, 'Build PPC campaign structure', 'Create campaign, ad group, keyword, and negative keyword map.', 'ongoing', 'high', 2, current_date + 3
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_ppc_workflow_id and title = 'Build PPC campaign structure');

  insert into erp.tasks (tenant_id, workflow_id, assigned_to, title, description, status, priority, sort_order, due_date)
  select v_tenant_id, v_ppc_workflow_id, v_user_id, 'Launch tracking QA', 'Verify pixel, conversions, UTMs, and lead routing.', 'yet_to_start', 'medium', 3, current_date + 5
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_ppc_workflow_id and title = 'Launch tracking QA');

  insert into erp.tasks (
    tenant_id,
    workflow_id,
    assigned_to,
    completed_by,
    title,
    description,
    status,
    priority,
    sort_order,
    due_date,
    completed_at
  )
  select v_tenant_id, v_seo_workflow_id, v_user_id, v_user_id, 'Technical SEO crawl', 'Review indexability, redirects, metadata, and page speed.', 'completed', 'high', 1, current_date + 2, now()
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_seo_workflow_id and title = 'Technical SEO crawl');

  insert into erp.tasks (tenant_id, workflow_id, assigned_to, title, description, status, priority, sort_order, due_date)
  select v_tenant_id, v_seo_workflow_id, v_user_id, 'Local SEO profile cleanup', 'Update GBP, NAP, categories, and appointment links.', 'ongoing', 'medium', 2, current_date + 4
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_seo_workflow_id and title = 'Local SEO profile cleanup');

  insert into erp.tasks (tenant_id, workflow_id, assigned_to, title, description, status, priority, sort_order, due_date)
  select v_tenant_id, v_seo_workflow_id, v_user_id, 'Service-page keyword mapping', 'Map procedures/services to target pages and queries.', 'yet_to_start', 'medium', 3, current_date + 6
  where not exists (select 1 from erp.tasks where tenant_id = v_tenant_id and workflow_id = v_seo_workflow_id and title = 'Service-page keyword mapping');

  update erp.workflows
  set completion_percentage = 33.33, updated_at = now()
  where id in (v_ppc_workflow_id, v_seo_workflow_id);

  insert into erp.activity_logs (
    tenant_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    after_values
  )
  select v_tenant_id, v_user_id, 'created', 'client', v_ppc_client_id, '{"seed": "phase1_ppc_seo_demo"}'::jsonb
  where not exists (
    select 1 from erp.activity_logs
    where tenant_id = v_tenant_id
      and entity_type = 'client'
      and entity_id = v_ppc_client_id
      and after_values->>'seed' = 'phase1_ppc_seo_demo'
  );

  insert into erp.activity_logs (
    tenant_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    after_values
  )
  select v_tenant_id, v_user_id, 'created', 'client', v_seo_client_id, '{"seed": "phase1_ppc_seo_demo"}'::jsonb
  where not exists (
    select 1 from erp.activity_logs
    where tenant_id = v_tenant_id
      and entity_type = 'client'
      and entity_id = v_seo_client_id
      and after_values->>'seed' = 'phase1_ppc_seo_demo'
  );
end $$;

select 'tenants' as table_name, count(*) from erp.tenants
union all select 'users', count(*) from erp.users
union all select 'scope_templates', count(*) from erp.scope_templates
union all select 'clients', count(*) from erp.clients
union all select 'workflows', count(*) from erp.workflows
union all select 'tasks', count(*) from erp.tasks
union all select 'activity_logs', count(*) from erp.activity_logs;
