export type Locale = 'en' | 'ar';

export interface PreviewTabCopy {
  id: 'command' | 'clinical' | 'portal' | 'finance';
  label: string;
  shortLabel: string;
  badge: string;
  headline: string;
  caption: string;
}

export interface EcosystemPillarCopy {
  id: string;
  tag: string;
  title: string;
  description: string;
  highlights: string[];
}

export interface FeatureCardCopy {
  id: string;
  category: string;
  title: string;
  description: string;
  badge?: string;
}

export interface WorkflowStepCopy {
  step: string;
  title: string;
  subtitle: string;
  description: string;
}

export interface PlanTierCopy {
  id: 'single' | 'multi' | 'enterprise';
  name: string;
  tagline: string;
  idealFor: string;
  ctaLabel: string;
  popular?: boolean;
  highlights: string[];
}

export interface TranslationContent {
  meta: {
    pageTitle: string;
  };
  nav: {
    ecosystem: string;
    features: string;
    workflow: string;
    plans: string;
    bookDemo: string;
    whatsapp: string;
    langSwitch: string;
  };
  hero: {
    releasePill: string;
    headlineStart: string;
    headlineHighlight: string;
    headlineEnd: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    whatsappMessage: string;
    proofChips: string[];
  };
  showcase: {
    windowSubtitle: string;
    liveIndicator: string;
    tabs: PreviewTabCopy[];
    command: {
      rangeLabels: ['Today', '7D', '30D'] | string[];
      kpis: Array<{ label: string; values: [string, string, string]; delta: string }>;
      queueTitle: string;
      queuePatients: Array<{ name: string; therapy: string; status: string; duration: string }>;
      timerLabel: string;
      timerValue: string;
    };
    clinical: {
      patientName: string;
      patientMeta: string;
      sections: Array<{ title: string; summary: string; metric: string }>;
      copilotTitle: string;
      copilotShortcut: string;
      copilotPrompt: string;
      copilotReply: string;
    };
    portal: {
      clinicName: string;
      bannerTag: string;
      bannerTitle: string;
      bannerSubtitle: string;
      screens: Array<{ title: string; detail: string }>;
      checkinLabel: string;
      checkinScore: string;
    };
    finance: {
      revenueLabel: string;
      revenueValue: string;
      netProfitLabel: string;
      netProfitValue: string;
      payrollTitle: string;
      doctors: Array<{ name: string; sessions: string; commission: string; loanNote: string }>;
      mobileCompanionTitle: string;
      mobilePrompt: string;
      mobileReply: string;
    };
  };
  ecosystem: {
    eyebrow: string;
    title: string;
    subtitle: string;
    pillars: EcosystemPillarCopy[];
  };
  features: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cards: FeatureCardCopy[];
  };
  workflow: {
    eyebrow: string;
    title: string;
    subtitle: string;
    steps: WorkflowStepCopy[];
    videoCard: {
      badge: string;
      title: string;
      description: string;
      duration: string;
      cta: string;
      mediaPlaceholderNote: string;
    };
  };
  plans: {
    eyebrow: string;
    title: string;
    subtitle: string;
    popularBadge: string;
    tiers: PlanTierCopy[];
  };
  demo: {
    eyebrow: string;
    title: string;
    subtitle: string;
    directTitle: string;
    directWhatsappLabel: string;
    directEmailLabel: string;
    coversTitle: string;
    covers: string[];
    form: {
      clinicNameLabel: string;
      clinicNamePlaceholder: string;
      contactNameLabel: string;
      contactNamePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      phoneLabel: string;
      phonePlaceholder: string;
      branchesLabel: string;
      branchOptions: Array<{ value: string; label: string }>;
      planLabel: string;
      planOptions: Array<{ value: string; label: string }>;
      modulesLabel: string;
      moduleOptions: Array<{ id: string; label: string }>;
      notesLabel: string;
      notesPlaceholder: string;
      submitBtn: string;
      submittingBtn: string;
      privacyNote: string;
      validationError: string;
    };
    success: {
      title: string;
      subtitle: string;
      referenceLabel: string;
      whatsappFollowUp: string;
      whatsappPrefillPrefix: string;
      submitAnother: string;
    };
  };
  footer: {
    tagline: string;
    linksTitle: string;
    contactTitle: string;
    copyright: string;
    domainLabel: string;
  };
  whatsappFloat: {
    label: string;
    prefill: string;
  };
}

export const translations: Record<Locale, TranslationContent> = {
  en: {
    meta: {
      pageTitle: 'P.T.A — Physical Therapy Assistant | Clinical Intelligence Suite',
    },
    nav: {
      ecosystem: 'Ecosystem',
      features: 'New Updates',
      workflow: 'How It Works',
      plans: 'Editions',
      bookDemo: 'Book Live Demo',
      whatsapp: 'WhatsApp',
      langSwitch: 'العربية',
    },
    hero: {
      releasePill: 'New v3.9 Release — Emerald Suite • Offline-First + Supabase Sync',
      headlineStart: 'Run Your ',
      headlineHighlight: 'Physical Therapy Clinic',
      headlineEnd: ' Without Spreadsheets or Revenue Leaks.',
      subheadline:
        'A unified clinical intelligence suite built for modern rehabilitation centers: real-time patient queue, PT & AI nutrition profiles, automated doctor commissions, Gemini Clinical Co-Pilot, multi-screen patient portal, and Owner Mobile app.',
      primaryCta: 'Book Your 15-Min Live Demo',
      secondaryCta: 'WhatsApp Sales Team',
      whatsappMessage:
        'Hello, I saw the new P.T.A v3.9 suite and would like to book a live demo for our clinic.',
      proofChips: [
        'Offline-First Local DB Speed',
        'Multi-Branch Sync & Cache',
        '100% Native English & Arabic RTL',
        'Supabase + Cloudinary Cloud Sync',
      ],
    },
    showcase: {
      windowSubtitle: 'Interactive Clinical Suite Preview — v3.9 Emerald UI',
      liveIndicator: 'Live Sync Active',
      tabs: [
        {
          id: 'command',
          label: 'Command Center',
          shortLabel: 'Command',
          badge: 'Today / 7D / 30D',
          headline: 'Real-Time Clinic Pulse & Fast Desk Queue',
          caption:
            'Track scheduled vs. active patients, live session timers, and Today / 7D / 30D financial metrics in one emerald workspace.',
        },
        {
          id: 'clinical',
          label: 'Clinical Suite & AI',
          shortLabel: 'Clinical + AI',
          badge: 'Ctrl+J Co-Pilot',
          headline: 'PT, Nutrition, Lymphatic & Gemini Co-Pilot',
          caption:
            'Structured red-flag screening, objective ROM/palpation, TDEE & food swaps, InBody uploads, auto doctor signatures, and instant AI protocol assistance.',
        },
        {
          id: 'portal',
          label: 'Patient Portal & Ads',
          shortLabel: 'Patient Portal',
          badge: 'QR + PIN Sync',
          headline: 'Multi-Screen Patient Portal & Ad Studio',
          caption:
            'Patients scan one QR code to view home exercises, daily pain check-ins, nutrition schedules, and Cloudinary-powered clinic promotional banners.',
        },
        {
          id: 'finance',
          label: 'Commissions & Owner App',
          shortLabel: 'Finance + Mobile',
          badge: 'Zero Leaks',
          headline: 'Doctor Commissions, Loans & Owner Mobile',
          caption:
            'Auto-calculate per-session doctor payouts, deduct staff salary advances automatically, and query your clinic performance from your phone.',
        },
      ],
      command: {
        rangeLabels: ['Today', '7D', '30D'],
        kpis: [
          { label: 'Daily Queue', values: ['18', '114', '486'], delta: '+14%' },
          { label: 'Active Load', values: ['9', '12', '15'], delta: 'Live' },
          { label: 'Realized Revenue', values: ['EGP 14,200', 'EGP 88,500', 'EGP 342,000'], delta: '+22%' },
        ],
        queueTitle: 'Fast Desk Live Queue',
        queuePatients: [
          { name: 'Sarah Abdelaziz', therapy: 'Lumbar Rehab • Session 4/8', status: 'In Room', duration: '24:12' },
          { name: 'Mohamed El-Sayed', therapy: 'ACL Post-Op • Session 6/12', status: 'Checked In', duration: 'Next' },
          { name: 'Reem Adel', therapy: 'Nutrition + InBody Follow-Up', status: 'Completed', duration: 'Signed' },
        ],
        timerLabel: 'Active Session Timer',
        timerValue: '00:24:12',
      },
      clinical: {
        patientName: 'Reem Adel — File #PT-4092',
        patientMeta: 'Cervical Radiculopathy • Package 6/12 Sessions • Branch: Maadi',
        sections: [
          { title: 'PT Assessment & ROM', summary: 'Red Flags Cleared • Objective C5-C6 & Palpation Logged', metric: 'Pain 3/10' },
          { title: 'AI Nutrition & TDEE', summary: '1,950 kcal Plan • Auto Food Swaps & Branded PDF Export', metric: 'InBody Synced' },
          { title: 'Auto Doctor Signature', summary: 'Stamped automatically on Clinical & Nutrition PDFs', metric: 'Verified' },
        ],
        copilotTitle: 'AI Clinical Co-Pilot',
        copilotShortcut: 'Ctrl+J',
        copilotPrompt: 'Summarize 30-day clinic performance & top rehab adherence alerts',
        copilotReply:
          'Net retention rose 18% this month. Two cervical patients reported pain >= 6/10 in Patient Portal check-ins — review flagged files.',
      },
      portal: {
        clinicName: 'Clinic Patient Portal',
        bannerTag: 'Clinic Offer • Cloudinary CDN',
        bannerTitle: 'Posture & Spine Recovery Package',
        bannerSubtitle: '12 sessions + InBody assessment + tailored home program',
        screens: [
          { title: 'Home Exercises', detail: '4 video-guided drills • 3 sets x 12 reps' },
          { title: 'Nutrition & Meals', detail: 'Daily macros + smart food swaps' },
          { title: 'My Schedule', detail: 'Next session: Tue 4:30 PM • Dr. Karim' },
        ],
        checkinLabel: 'Daily Pain Check-In Synced',
        checkinScore: 'Pain 2/10 • Great Mobility',
      },
      finance: {
        revenueLabel: 'Monthly Realized Revenue',
        revenueValue: 'EGP 342,000',
        netProfitLabel: 'Net Clinic Profit',
        netProfitValue: 'EGP 218,400',
        payrollTitle: 'Automated Doctor Commissions & Loan Ledger',
        doctors: [
          { name: 'Dr. Karim Hassan', sessions: '64 Sessions', commission: 'EGP 28,800', loanNote: 'Advance -2,000 auto-deducted' },
          { name: 'Dr. Salma Nabil', sessions: '52 Sessions', commission: 'EGP 23,400', loanNote: 'No pending deductions' },
        ],
        mobileCompanionTitle: 'Owner Mobile Companion',
        mobilePrompt: '"How did Maadi branch perform today?"',
        mobileReply: '18 sessions completed • EGP 14,200 collected • 0 unpaid packages.',
      },
    },
    ecosystem: {
      eyebrow: 'Four Connected Surfaces',
      title: 'One Unified Operating System — Desktop, Portal, Mobile & AI',
      subtitle:
        'Built from the ground up so receptionists, physiotherapists, nutritionists, patients, and clinic owners stay synchronized without manual spreadsheets.',
      pillars: [
        {
          id: 'desktop',
          tag: 'Offline-First Desktop',
          title: 'Clinical Command Center',
          description:
            'Lightning-fast local SQLite engine with multi-branch background replication so your reception never freezes even if clinic Wi-Fi drops.',
          highlights: ['Today / 7D / 30D Analytics', 'Fast Desk Triage Queue', 'Auto-Updater & LAN Sync'],
        },
        {
          id: 'portal',
          tag: 'Vercel + Supabase Cloud',
          title: 'Multi-Screen Patient Portal',
          description:
            'Zero app install required. Patients scan their QR card + PIN to access home exercises, nutrition plans, upcoming sessions, and clinic offers.',
          highlights: ['4 Dedicated Patient Views', 'Daily Pain & Feedback Loop', 'Ad Banner Carousel Studio'],
        },
        {
          id: 'mobile',
          tag: 'iOS & Android Companion',
          title: 'Owner Mobile Pulse',
          description:
            'Stay connected to your branches from anywhere with secure pairing, bilingual voice/chat queries, and live revenue/doctor summaries.',
          highlights: ['QR Pairing in Seconds', 'Live Branch Performance', 'Voice & Text AI Queries'],
        },
        {
          id: 'ai',
          tag: 'Powered by Google Gemini',
          title: 'AI Clinical Co-Pilot',
          description:
            'Summon your intelligent assistant anywhere with Ctrl+J to draft rehabilitation & nutrition plans or analyze financial and doctor productivity.',
          highlights: ['Clinical Protocol Guidance', 'AI Nutrition & Food Swaps', 'Instant Executive Summaries'],
        },
      ],
    },
    features: {
      eyebrow: 'What’s New Across v3.9',
      title: 'Everything Required to Run an Elite Physical Therapy Practice',
      subtitle:
        'Every recent update engineered around real physical therapy, sports rehab, nutrition, and multi-branch clinic workflows.',
      cards: [
        {
          id: 'profiles',
          category: 'Clinical EHR',
          title: 'PT, Nutrition & Lymphatic Profiles',
          description:
            'Red-flag triage, subjective/objective ROM & palpation rows, lymphatic measurements, and structured session treatment plans.',
          badge: 'Updated',
        },
        {
          id: 'nutrition',
          category: 'Nutrition & Reports',
          title: 'TDEE Calculator, Food Swaps & PDF Exports',
          description:
            'Generate personalized nutrition plans, swap ingredients in one click, log InBody composition uploads, and export branded PDFs with auto doctor signatures.',
          badge: 'New',
        },
        {
          id: 'commissions',
          category: 'Financial Engine',
          title: 'Doctor Commissions & Salary Loan Deductions',
          description:
            'Automatically track package session consumption, calculate per-doctor commissions, settle staff salary loans, and log daily wastes.',
        },
        {
          id: 'queue',
          category: 'Front Desk',
          title: 'Fast Desk Queue & Live Session Timers',
          description:
            'Visual patient intake flow with real-time session stopwatches, attendance check-ins, and instant doctor assignment.',
        },
        {
          id: 'whatsapp',
          category: 'Patient Engagement',
          title: '1-Click WhatsApp & Ad Banner Studio',
          description:
            'Send formatted session reminders or review links via WhatsApp and push Cloudinary-optimized clinic promotional banners directly to the patient portal.',
          badge: 'Cloudinary CDN',
        },
        {
          id: 'branches',
          category: 'Scale & Sync',
          title: 'Multi-Branch Cache & Conflict-Safe Sync',
          description:
            'Manage separate branches with scoped role permissions, branch switching for owners/CFOs, and resilient cloud sync via Supabase.',
        },
        {
          id: 'security',
          category: 'Governance',
          title: 'Role-Based Access & Full Audit Trail',
          description:
            'Granular roles for Admin, CFO, Doctor, and Front Desk staff with automated audit logs on edits, payments, and package updates.',
        },
        {
          id: 'bilingual',
          category: 'Built for the Region',
          title: 'Instant English / Arabic RTL Switch',
          description:
            'Flip every screen, clinical PDF, and patient portal view seamlessly between English and native Arabic RTL in real time.',
          badge: '100% RTL',
        },
      ],
    },
    workflow: {
      eyebrow: 'End-to-End Clinic Lifecycle',
      title: 'How High-Performing Clinics Operate on P.T.A',
      subtitle:
        'From the moment a patient walks in to home recovery tracking and month-end doctor payroll — every step feeds the next automatically.',
      steps: [
        {
          step: '01',
          title: 'Intake, Packages & Queue',
          subtitle: 'Reception Desk',
          description:
            'Register patients, assign treatment packages, schedule doctors, and move patients smoothly through the Fast Desk Queue.',
        },
        {
          step: '02',
          title: 'Clinical Care & AI Co-Pilot',
          subtitle: 'Treatment Room',
          description:
            'Record PT assessments, InBody metrics, or AI nutrition plans with live session timers and automatic doctor PDF signatures.',
        },
        {
          step: '03',
          title: 'QR Patient Portal Sync',
          subtitle: 'Home Recovery',
          description:
            'Patients scan a QR code to follow prescribed exercises, log daily pain scores, and see clinic promotional banners hosted on Cloudinary.',
        },
        {
          step: '04',
          title: 'Commissions & Owner Pulse',
          subtitle: 'Executive Oversight',
          description:
            'Watch net revenue, doctor commissions, and loan deductions update automatically — and check branch stats on Owner Mobile.',
        },
      ],
      videoCard: {
        badge: 'Live Walkthrough Available',
        title: 'See Every Module Running Live on Your Clinic Workflow',
        description:
          'We walk clinic owners and medical directors through the Command Center, Patient Portal, Owner Mobile app, and Arabic RTL interface in a focused 15-minute live session.',
        duration: '15-Minute Personalized Demo',
        cta: 'Schedule Your Walkthrough',
        mediaPlaceholderNote: 'Product demo reel ready to connect via Cloudinary (`hero_video` slot).',
      },
    },
    plans: {
      eyebrow: 'Deployment Editions',
      title: 'Tailored to Every Stage of Your Practice',
      subtitle:
        'Start with a single rehabilitation clinic or unify multiple branches under one clinical and financial command center.',
      popularBadge: 'Most Popular',
      tiers: [
        {
          id: 'single',
          name: 'Single Clinic Edition',
          tagline: 'Ideal for growing physiotherapy & sports rehab centers',
          idealFor: '1 Branch • Full Clinical & Financial Core',
          ctaLabel: 'Book Demo for Single Clinic',
          highlights: [
            'Offline-first Desktop App + Instant EN/AR RTL',
            'PT, Nutrition, Lymphatic & InBody Profiles',
            'Supabase Patient Portal (QR + PIN Sync)',
            'Doctor Commissions, Payroll & PDF Exports',
          ],
        },
        {
          id: 'multi',
          name: 'Multi-Branch Suite',
          tagline: 'Built for clinics scaling across multiple locations',
          idealFor: '2–5 Branches • Cloud Replication + AI + Mobile',
          ctaLabel: 'Book Demo for Multi-Branch',
          popular: true,
          highlights: [
            'Everything in Single Clinic Edition',
            'Multi-Branch Sync & Executive Branch Switcher',
            'Owner Mobile Companion App + Voice AI Pulse',
            'Gemini AI Clinical Co-Pilot & Ad Banner Studio',
          ],
        },
        {
          id: 'enterprise',
          name: 'Clinic Network & Custom',
          tagline: 'Dedicated onboarding for medical groups & hospitals',
          idealFor: '5+ Branches • Custom Rollout & Training',
          ctaLabel: 'Talk to Deployment Team',
          highlights: [
            'Centralized Multi-Branch Audit & CFO Controls',
            'Custom Data Migration & Staff Onboarding',
            'Dedicated WhatsApp & Priority Engineering Support',
            'Custom Branded Patient Portal Domain Setup',
          ],
        },
      ],
    },
    demo: {
      eyebrow: 'Book a Live Demo',
      title: 'Ready to Upgrade Your Clinic Operations?',
      subtitle:
        'Submit your clinic details below. Your request is saved securely to Supabase and our team responds directly via email and WhatsApp.',
      directTitle: 'Direct Contact Channels',
      directWhatsappLabel: 'WhatsApp & Calls',
      directEmailLabel: 'Email',
      coversTitle: 'What Your 15-Minute Live Demo Covers',
      covers: [
        'Live walkthrough of the v3.9 Command Center, Fast Desk Queue & Today/7D/30D KPIs',
        'Testing the QR + PIN Patient Portal and Cloudinary promotional banner carousel',
        'Reviewing automated doctor commissions, loan deductions & multi-branch migration',
      ],
      form: {
        clinicNameLabel: 'Clinic / Center Name *',
        clinicNamePlaceholder: 'e.g. Revive Physical Therapy Center',
        contactNameLabel: 'Your Name & Role *',
        contactNamePlaceholder: 'e.g. Dr. Ahmed Hassan — Clinic Owner',
        emailLabel: 'Work Email *',
        emailPlaceholder: 'owner@yourclinic.com',
        phoneLabel: 'WhatsApp / Phone Number *',
        phonePlaceholder: 'e.g. 01001234567',
        branchesLabel: 'Number of Branches',
        branchOptions: [
          { value: '1', label: '1 Branch' },
          { value: '2-3', label: '2–3 Branches' },
          { value: '4+', label: '4+ Branches' },
        ],
        planLabel: 'Preferred Edition',
        planOptions: [
          { value: 'Single Clinic Edition', label: 'Single Clinic Edition' },
          { value: 'Multi-Branch Suite', label: 'Multi-Branch Suite' },
          { value: 'Clinic Network & Custom', label: 'Clinic Network & Custom' },
        ],
        modulesLabel: 'Key Modules You Want to See',
        moduleOptions: [
          { id: 'Command Center & Queue', label: 'Command Center & Queue' },
          { id: 'PT & Nutrition Profiles', label: 'PT & Nutrition Profiles' },
          { id: 'Doctor Commissions & Payroll', label: 'Doctor Commissions' },
          { id: 'Patient Portal (QR + PIN)', label: 'Patient Portal' },
          { id: 'Gemini AI Co-Pilot', label: 'AI Co-Pilot' },
          { id: 'Owner Mobile App', label: 'Owner Mobile App' },
        ],
        notesLabel: 'Notes or Specific Challenges (Optional)',
        notesPlaceholder: 'Tell us about your team size, current workflow, or migration needs...',
        submitBtn: 'Request Live Demo',
        submittingBtn: 'Submitting Request...',
        privacyNote: 'Protected submission • Confirmation email sent via Resend.',
        validationError: 'Please fill in all required clinic and contact fields accurately.',
      },
      success: {
        title: 'Demo Request Confirmed!',
        subtitle:
          'We saved your request and sent a confirmation email. Our onboarding team will message you shortly to lock in a time.',
        referenceLabel: 'Reference ID',
        whatsappFollowUp: 'Fast-Track via WhatsApp Now',
        whatsappPrefillPrefix: 'Hello! I just submitted a live demo request for',
        submitAnother: 'Submit Another Request',
      },
    },
    footer: {
      tagline:
        'Clinical intelligence operating system engineered for modern physical therapy, sports rehab, and nutrition clinics.',
      linksTitle: 'Sections',
      contactTitle: 'Contact & Domain',
      copyright: 'All rights reserved.',
      domainLabel: 'Official Site',
    },
    whatsappFloat: {
      label: 'Chat on WhatsApp',
      prefill: 'Hello, I would like to learn more about P.T.A and book a live demo.',
    },
  },
  ar: {
    meta: {
      pageTitle: 'منظومة P.T.A — نظام الإدارة والذكاء السريري لعيادات العلاج الطبيعي',
    },
    nav: {
      ecosystem: 'المنظومة',
      features: 'أحدث المزايا',
      workflow: 'كيف يعمل',
      plans: 'الباقات',
      bookDemo: 'احجز عرضاً مباشراً',
      whatsapp: 'واتساب',
      langSwitch: 'English',
    },
    hero: {
      releasePill: 'تحديث v3.9 الجديد — واجهة Emerald • سرعة محلية + مزامنة Supabase',
      headlineStart: 'أدِر ',
      headlineHighlight: 'عيادة العلاج الطبيعي',
      headlineEnd: ' باحترافية كاملة دون ملفات ورقية أو تسرب مالي.',
      subheadline:
        'منظومة طبية متكاملة تجمع كل احتياجات مراكز العلاج الطبيعي والتأهيل: شاشة استقبال حية، ملفات علاج طبيعي وتغذية علاجية، حساب تلقائي لعمولات الأطباء، مساعد ذكي بـ Gemini، بوابة مرضى متكاملة، وتطبيق جوال لمالك العيادة.',
      primaryCta: 'احجز عرضاً مباشراً (15 دقيقة)',
      secondaryCta: 'تواصل عبر واتساب',
      whatsappMessage:
        'مرحباً، اطلعت على تحديثات منظومة P.T.A v3.9 وأرغب في حجز عرض تجريبي مباشر لعيادتنا.',
      proofChips: [
        'يعمل محلياً بأقصى سرعة (Offline-First)',
        'مزامنة متعددة الفروع',
        'عربي RTL وإنجليزي أصلي بالكامل',
        'مزامنة سحابية Supabase + Cloudinary',
      ],
    },
    showcase: {
      windowSubtitle: 'معاينة تفاعلية للمنظومة — واجهة v3.9 الجديدة',
      liveIndicator: 'المزامنة السحابية نشطة',
      tabs: [
        {
          id: 'command',
          label: 'مركز القيادة',
          shortLabel: 'لوحة القيادة',
          badge: 'اليوم / 7 أيام / 30 يوم',
          headline: 'متابعة حية للعيادة وقائمة الانتظار السريعة',
          caption:
            'راقب حركة المرضى، ومؤقت الجلسات المباشر، وإيرادات اليوم أو 7 أيام أو 30 يوماً من شاشة واحدة واضحة.',
        },
        {
          id: 'clinical',
          label: 'الملف الطبي و AI',
          shortLabel: 'الطبي + AI',
          badge: 'Ctrl+J مساعد ذكي',
          headline: 'تقييم العلاج الطبيعي والتغذية والمساعد الذكي',
          caption:
            'فحص المؤشرات الخطرة، المدى الحركي، حاسبة السعرات TDEE، تقارير InBody، توقيع الطبيب التلقائي، ومساعد Gemini السريري.',
        },
        {
          id: 'portal',
          label: 'بوابة المريض والإعلانات',
          shortLabel: 'بوابة المريض',
          badge: 'QR + PIN',
          headline: 'بوابة مرضى متعددة الشاشات واستوديو إعلانات',
          caption:
            'يمسح المريض رمز QR لمتابعة تمارينه المنزلية، تقييم الألم اليومي، جدول الجلسات، وعروض العيادة عبر Cloudinary.',
        },
        {
          id: 'finance',
          label: 'العمولات وتطبيق المالك',
          shortLabel: 'المالية + الجوال',
          badge: 'صفر تسرب مالي',
          headline: 'عمولات الأطباء والسلف وتطبيق المالك',
          caption:
            'حساب تلقائي لنسب الأطباء، خصم السلف من الرواتب أوتوماتيكياً، ومتابعة أداء جميع الفروع من هاتفك.',
        },
      ],
      command: {
        rangeLabels: ['اليوم', '7 أيام', '30 يوم'],
        kpis: [
          { label: 'قائمة اليوم', values: ['18', '114', '486'], delta: '+14%' },
          { label: 'الحالات النشطة', values: ['9', '12', '15'], delta: 'مباشر' },
          { label: 'الإيراد المحقق', values: ['14,200 ج.م', '88,500 ج.م', '342,000 ج.م'], delta: '+22%' },
        ],
        queueTitle: 'قائمة الاستقبال المباشرة',
        queuePatients: [
          { name: 'سارة عبد العزيز', therapy: 'تأهيل الفقرات القطنية • جلسة 4/8', status: 'داخل الجلسة', duration: '24:12' },
          { name: 'محمد السيد', therapy: 'تأهيل الرباط الصليبي • جلسة 6/12', status: 'تم الحضور', duration: 'التالي' },
          { name: 'ريم عادل', therapy: 'متابعة تغذية + InBody', status: 'مكتمل', duration: 'موقّع' },
        ],
        timerLabel: 'مؤقت الجلسة النشطة',
        timerValue: '00:24:12',
      },
      clinical: {
        patientName: 'ريم عادل — ملف #PT-4092',
        patientMeta: 'آلام فقرات عنقية • باقة 6 من 12 جلسة • فرع المعادي',
        sections: [
          { title: 'تقييم العلاج الطبيعي', summary: 'فحص Red Flags سليم • قياس ROM والفحص اليدوي مسجل', metric: 'الألم 3/10' },
          { title: 'التغذية الذكية و TDEE', summary: 'خطة 1,950 سعرة • بدائل غذائية وتصدير PDF موثق', metric: 'تم ربط InBody' },
          { title: 'توقيع الطبيب التلقائي', summary: 'إضافة توقيع الطبيب تلقائياً على التقارير والأنظمة', metric: 'موثّق' },
        ],
        copilotTitle: 'المساعد السريري الذكي',
        copilotShortcut: 'Ctrl+J',
        copilotPrompt: 'لخّص أداء آخر 30 يوماً وأهم تنبيهات التزام المرضى',
        copilotReply:
          'ارتفع معدل إتمام الباقات بنسبة 18% هذا الشهر. هناك حالتان سجلتا ألم >= 6/10 في بوابة المريض — يُنصح بالمراجعة.',
      },
      portal: {
        clinicName: 'بوابة المريض الإلكترونية',
        bannerTag: 'عرض العيادة • Cloudinary CDN',
        bannerTitle: 'باقة تأهيل العمود الفقري المتكاملة',
        bannerSubtitle: '12 جلسة علاج طبيعي + قياس InBody + برنامج تمارين منزلي',
        screens: [
          { title: 'التمارين المنزلية', detail: '4 تمارين موضحة بالفيديو • 3 مجموعات × 12 عدة' },
          { title: 'التغذية والوجبات', detail: 'خطة يومية مع بدائل أطعمة مرنة' },
          { title: 'جدول المواعيد', detail: 'الجلسة القادمة: الثلاثاء 4:30 م • د. كريم' },
        ],
        checkinLabel: 'تمت مزامنة تقييم الألم اليومي',
        checkinScore: 'الألم 2/10 • تحسن ممتاز في الحركة',
      },
      finance: {
        revenueLabel: 'الإيراد الشهري المحقق',
        revenueValue: '342,000 ج.م',
        netProfitLabel: 'صافي ربح العيادة',
        netProfitValue: '218,400 ج.م',
        payrollTitle: 'سجل عمولات الأطباء والخصومات التلقائية',
        doctors: [
          { name: 'د. كريم حسن', sessions: '64 جلسة', commission: '28,800 ج.م', loanNote: 'خصم سلفة 2,000 تلقائياً' },
          { name: 'د. سلمى نبيل', sessions: '52 جلسة', commission: '23,400 ج.م', loanNote: 'لا توجد خصومات معلقة' },
        ],
        mobileCompanionTitle: 'تطبيق المالك على الجوال',
        mobilePrompt: '"كيف كان أداء فرع المعادي اليوم؟"',
        mobileReply: '18 جلسة مكتملة • تحصيل 14,200 ج.م • 0 باقات غير مسددة.',
      },
    },
    ecosystem: {
      eyebrow: 'أربع منصات مترابطة',
      title: 'منظومة تشغيل موحدة — سطح المكتب، بوابة المريض، الجوال، والذكاء الاصطناعي',
      subtitle:
        'مصممة لتعمل فرق الاستقبال والأطباء وأخصائيو التغذية والمرضى ومالك العيادة بتناغم لحظي كامل بدون أي تعقيد.',
      pillars: [
        {
          id: 'desktop',
          tag: 'سطح مكتب يعمل دون انقطاع',
          title: 'مركز القيادة السريري',
          description:
            'قاعدة بيانات محلية فائقة السرعة مع مزامنة خلفية متعددة الفروع لضمان استمرار العمل حتى عند ضعف أو انقطاع الإنترنت.',
          highlights: ['تقارير اليوم / 7 أيام / 30 يوم', 'شاشة الاستقبال السريعة', 'تحديث تلقائي ومزامنة LAN'],
        },
        {
          id: 'portal',
          tag: 'سحابة Vercel + Supabase',
          title: 'بوابة المريض متعددة الشاشات',
          description:
            'دون تثبيت أي تطبيق. يمسح المريض رمز QR مع رمز PIN ليصل إلى تمارينه المنزلية، نظامه الغذائي، مواعيده، وعروض العيادة.',
          highlights: ['4 شاشات مخصصة للمريض', 'تقييم الألم اليومي والمتابعة', 'عارض بنرات إعلانية بالعيادة'],
        },
        {
          id: 'mobile',
          tag: 'تطبيق iOS و Android',
          title: 'تطبيق نبض المالك',
          description:
            'تابع أداء الفروع في أي وقت عبر ربط آمن بالرمز، مع مساعد صوتي ونصي يستخرج لك خلاصة الأرباح وحالة الجلسات فوراً.',
          highlights: ['ربط فوري عبر QR', 'متابعة إيراد كل فرع', 'أوامر صوتية وذكاء اصطناعي'],
        },
        {
          id: 'ai',
          tag: 'مدعوم بـ Google Gemini',
          title: 'المساعد السريري الذكي',
          description:
            'استدعِ المساعد الذكي من أي شاشة بالضغط على Ctrl+J لاقتراح برامج التأهيل والتغذية أو تحليل إنتاجية الأطباء والأرباح.',
          highlights: ['بروتوكولات علاج وتأهيل ذكية', 'خطط تغذية وبدائل وجبات', 'ملخصات إدارية ومالية فورية'],
        },
      ],
    },
    features: {
      eyebrow: 'أبرز مزايا التحديث v3.9',
      title: 'كل ما تحتاجه لإدارة عيادة علاج طبيعي حديثة',
      subtitle:
        'كل أداة في المنظومة بُنيت استناداً إلى سير العمل الفعلي داخل مراكز العلاج الطبيعي، إصابات الملاعب، والتغذية العلاجية.',
      cards: [
        {
          id: 'profiles',
          category: 'السجل الطبي EHR',
          title: 'ملفات العلاج الطبيعي والتغذية والليمفاوي',
          description:
            'تقييم شامل يشمل Red Flags، المدى الحركي، الفحص اليدوي، القياسات الليمفاوية، وخطط الجلسات المنظمة لكل حالة.',
          badge: 'محدّث',
        },
        {
          id: 'nutrition',
          category: 'التغذية والتقارير',
          title: 'حاسبة TDEE وبدائل الطعام وتصدير PDF',
          description:
            'أنشئ خططاً غذائية ذكية مع تبديل الأصناف بضغطة زر، وحفظ صور InBody، وتصدير ملفات PDF بتوقيع الطبيب التلقائي.',
          badge: 'جديد',
        },
        {
          id: 'commissions',
          category: 'الإدارة المالية',
          title: 'عمولات الأطباء وخصم سلف الرواتب',
          description:
            'احتساب دقيق لاستهلاك جلسات الباقات، وحساب نسبة كل طبيب من الجلسات، وخصم السلف والمصروفات اليومية تلقائياً.',
        },
        {
          id: 'queue',
          category: 'الاستقبال والعيادة',
          title: 'قائمة الانتظار السريعة ومؤقت الجلسة',
          description:
            'إدارة انسيابية لدخول المرضى وتوزيعهم على الأطباء مع مؤقت حي لكل جلسة وتسجيل حضور وانصراف الفريق.',
        },
        {
          id: 'whatsapp',
          category: 'تواصل المرضى',
          title: 'رسائل واتساب بنقرة واستوديو الإعلانات',
          description:
            'إرسال تذكيرات المواعيد وتقييمات الجلسات عبر واتساب فوراً، مع رفع عروض العيادة عبر Cloudinary لتظهر في بوابة المريض.',
          badge: 'Cloudinary CDN',
        },
        {
          id: 'branches',
          category: 'التوسع والمزامنة',
          title: 'دعم متعدد الفروع ومزامنة آمنة',
          description:
            'انتقل بين الفروع بسهولة مع عزل بيانات كل فرع ومزامنة ذكية تحمي البيانات عند العمل دون اتصال.',
        },
        {
          id: 'security',
          category: 'الرقابة والأمان',
          title: 'صلاحيات دقيقة وسجل تدقيق كامل',
          description:
            'صلاحيات منفصلة للإدارة، المدير المالي، الطبيب، والاستقبال مع تتبع كامل لأي تعديل في المدفوعات أو الجلسات.',
        },
        {
          id: 'bilingual',
          category: 'مصمم للمنطقة',
          title: 'تحويل فوري بين العربية RTL والإنجليزية',
          description:
            'تبديل لحظي كامل للواجهة وتقارير PDF وبوابة المرضى بين اللغة العربية (RTL) واللغة الإنجليزية.',
          badge: 'عربي RTL 100%',
        },
      ],
    },
    workflow: {
      eyebrow: 'دورة العمل المتكاملة',
      title: 'كيف تعمل العيادات المتطورة مع منظومة P.T.A',
      subtitle:
        'من لحظة دخول المريض وحتى متابعة تمارينه في المنزل وإغلاق حسابات الأطباء نهاية الشهر — كل خطوة تتكامل تلقائياً.',
      steps: [
        {
          step: '01',
          title: 'الاستقبال، الباقات وقائمة الانتظار',
          subtitle: 'مكتب الاستقبال',
          description:
            'تسجيل المريض، تفعيل باقة الجلسات، جدولة المواعيد، وتوجيه الحالات عبر قائمة الانتظار السريعة.',
        },
        {
          step: '02',
          title: 'التقييم الطبي والمساعد الذكي',
          subtitle: 'غرفة العلاج',
          description:
            'توثيق التقييمات، وملفات InBody، وخطط التغذية مع مؤقت الجلسة وتوقيع الطبيب التلقائي على التقارير.',
        },
        {
          step: '03',
          title: 'بوابة المريض عبر رمز QR',
          subtitle: 'المتابعة المنزلية',
          description:
            'يمسح المريض الرمز ليتابع تمارينه المنزلية، يسجل مستوى الألم اليومي، ويشاهد أحدث عروض العيادة.',
        },
        {
          step: '04',
          title: 'العمولات وتقارير المالك',
          subtitle: 'الإدارة العليا',
          description:
            'تُحتسب صافي الأرباح وعمولات الأطباء والخصومات تلقائياً مع متابعة فورية عبر تطبيق المالك على الجوال.',
        },
      ],
      videoCard: {
        badge: 'عرض حي متاح',
        title: 'شاهد جميع الشاشات تعمل فعلياً على طبيعة عمل عيادتك',
        description:
          'نقدم لمالكي العيادات والمديرين الطبيين جولة عملية لمدة 15 دقيقة نستعرض فيها لوحة القيادة، بوابة المريض، تطبيق المالك، والواجهة العربية الكاملة.',
        duration: 'جلسة عرض مخصصة — 15 دقيقة',
        cta: 'احجز جولتك الآن',
        mediaPlaceholderNote: 'مكان مخصص لفيديو العرض الترويجي عبر Cloudinary (`hero_video`).',
      },
    },
    plans: {
      eyebrow: 'باقات التشغيل',
      title: 'اختر النسخة المناسبة لحجم عيادتك',
      subtitle:
        'ابدأ بفرع واحد متكامل أو وحّد عدة فروع تحت منظومة طبية ومالية وسحابية واحدة.',
      popularBadge: 'الأكثر طلباً',
      tiers: [
        {
          id: 'single',
          name: 'نسخة العيادة الواحدة',
          tagline: 'مثالية لمراكز العلاج الطبيعي والتأهيل المستقلة',
          idealFor: 'فرع واحد • النظام الطبي والمالي الكامل',
          ctaLabel: 'اطلب عرضاً للعيادة الواحدة',
          highlights: [
            'تطبيق سطح المكتب فائق السرعة (عربي RTL / إنجليزي)',
            'ملفات العلاج الطبيعي والتغذية والليمفاوي و InBody',
            'بوابة المريض عبر Supabase (دخول QR + PIN)',
            'عمولات الأطباء والرواتب وتصدير تقارير PDF',
          ],
        },
        {
          id: 'multi',
          name: 'باقة الفروع المتعددة',
          tagline: 'مصممة للمراكز المتوسعة في أكثر من فرع',
          idealFor: '2–5 فروع • مزامنة سحابية + AI + تطبيق المالك',
          ctaLabel: 'اطلب عرضاً للفروع المتعددة',
          popular: true,
          highlights: [
            'جميع مزايا نسخة العيادة الواحدة',
            'مزامنة الفروع ومبدل فوري لإدارة المالك',
            'تطبيق المالك على الجوال مع الاستعلام الصوتي',
            'المساعد السريري Gemini AI واستوديو بنرات Cloudinary',
          ],
        },
        {
          id: 'enterprise',
          name: 'شبكات العيادات والمستشفيات',
          tagline: 'تشغيل مخصص وتدريب شامل للمجموعات الطبية',
          idealFor: '+5 فروع • تخصيص وتكامل كامل',
          ctaLabel: 'تواصل مع فريق التشغيل',
          highlights: [
            'رقابة مالية مركزية وسجلات تدقيق للمدير المالي CFO',
            'نقل البيانات الحالية وتدريب الأطباء والاستقبال',
            'دعم فني مباشر وأولوية عبر واتساب والهندسة',
            'ربط نطاق مخصص لبوابة مرضى العيادة',
          ],
        },
      ],
    },
    demo: {
      eyebrow: 'احجز عرضاً مباشراً',
      title: 'هل أنت جاهز للارتقاء بتشغيل عيادتك؟',
      subtitle:
        'سجل بيانات عيادتك أدناه؛ يتم حفظ الطلب بأمان في Supabase وسيتواصل معك فريقنا مباشرة عبر البريد والواتساب.',
      directTitle: 'قنوات التواصل المباشر',
      directWhatsappLabel: 'واتساب والاتصال',
      directEmailLabel: 'البريد الإلكتروني',
      coversTitle: 'ماذا ستشاهد في جلسة الـ 15 دقيقة؟',
      covers: [
        'استعراض حي لتحديثات v3.9 ولوحة القيادة السريعة وإحصائيات اليوم/الأسبوع/الشهر',
        'تجربة حية لبوابة المريض بالـ QR وعرض البنرات الإعلانية عبر Cloudinary',
        'شرح آلية حساب عمولات الأطباء، خصم السلف، والربط بين الفروع',
      ],
      form: {
        clinicNameLabel: 'اسم العيادة أو المركز *',
        clinicNamePlaceholder: 'مثال: مركز ريفايف للعلاج الطبيعي',
        contactNameLabel: 'الاسم والصفة *',
        contactNamePlaceholder: 'مثال: د. أحمد حسن — مالك العيادة',
        emailLabel: 'البريد الإلكتروني *',
        emailPlaceholder: 'owner@yourclinic.com',
        phoneLabel: 'رقم الواتساب / الهاتف *',
        phonePlaceholder: 'مثال: 01001234567',
        branchesLabel: 'عدد الفروع',
        branchOptions: [
          { value: '1', label: 'فرع واحد' },
          { value: '2-3', label: '2–3 فروع' },
          { value: '4+', label: '4 فروع فأكثر' },
        ],
        planLabel: 'الباقة المطلوبة',
        planOptions: [
          { value: 'Single Clinic Edition', label: 'نسخة العيادة الواحدة' },
          { value: 'Multi-Branch Suite', label: 'باقة الفروع المتعددة' },
          { value: 'Clinic Network & Custom', label: 'شبكات العيادات والمستشفيات' },
        ],
        modulesLabel: 'الأقسام التي تهمك في العرض',
        moduleOptions: [
          { id: 'Command Center & Queue', label: 'لوحة القيادة والاستقبال' },
          { id: 'PT & Nutrition Profiles', label: 'ملفات العلاج والتغذية' },
          { id: 'Doctor Commissions & Payroll', label: 'عمولات الأطباء والرواتب' },
          { id: 'Patient Portal (QR + PIN)', label: 'بوابة المريض (QR)' },
          { id: 'Gemini AI Co-Pilot', label: 'المساعد الذكي AI' },
          { id: 'Owner Mobile App', label: 'تطبيق المالك' },
        ],
        notesLabel: 'ملاحظات أو احتياجات خاصة (اختياري)',
        notesPlaceholder: 'أخبرنا عن عدد الأطباء أو الفروع أو أي تحديات ترغب في حلها...',
        submitBtn: 'إرسال طلب العرض المباشر',
        submittingBtn: 'جاري إرسال الطلب...',
        privacyNote: 'بياناتك محمية • سيصلك بريد تأكيد تلقائي عبر Resend.',
        validationError: 'يرجى التأكد من ملء اسم العيادة واسمك والبريد الإلكتروني ورقم الواتساب بشكل صحيح.',
      },
      success: {
        title: 'تم تأكيد طلب العرض بنجاح!',
        subtitle:
          'تم حفظ طلبك وإرسال رسالة تأكيد على بريدك الإلكتروني. سيتواصل معك فريقنا قريباً لتحديد الموعد المناسب.',
        referenceLabel: 'رقم المرجع',
        whatsappFollowUp: 'تواصل الآن عبر واتساب لتسريع الموعد',
        whatsappPrefillPrefix: 'مرحباً! قمت للتو بإرسال طلب عرض تجريبي لعيادة',
        submitAnother: 'إرسال طلب آخر',
      },
    },
    footer: {
      tagline:
        'منظومة الذكاء السريري والإداري المصممة خصيصاً لعيادات العلاج الطبيعي، التأهيل الرياضي، والتغذية العلاجية.',
      linksTitle: 'أقسام الصفحة',
      contactTitle: 'التواصل والنطاق',
      copyright: 'جميع الحقوق محفوظة.',
      domainLabel: 'الموقع الرسمي',
    },
    whatsappFloat: {
      label: 'تواصل واتساب',
      prefill: 'مرحباً، أود معرفة المزيد عن منظومة P.T.A وحجز عرض تجريبي.',
    },
  },
};
