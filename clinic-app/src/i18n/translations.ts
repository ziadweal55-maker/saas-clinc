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
      rangeLabels: string[];
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
      copilotBadge: string;
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
    banner: {
      eyebrow: string;
      headline: string;
      stats: string[];
    };
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
      previewActionLabel: string;
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
    photoBannerTitle: string;
    photoBannerSubtitle: string;
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
      pageTitle: 'P.T.A — Physical Therapy Assistant | Clinic Management Suite',
    },
    nav: {
      ecosystem: 'Platform',
      features: 'Capabilities',
      workflow: 'How It Works',
      plans: 'Editions',
      bookDemo: 'Book Live Demo',
      whatsapp: 'WhatsApp',
      langSwitch: 'العربية',
    },
    hero: {
      releasePill: 'Built for Modern Physical Therapy & Rehab Centers',
      headlineStart: 'Run Your ',
      headlineHighlight: 'Physical Therapy Clinic',
      headlineEnd: ' Without Paper Files or Revenue Leaks.',
      subheadline:
        'Everything your center needs in one place: live patient reception queue, physical therapy & nutrition files, automatic doctor commissions, a smart clinical assistant, a patient portal via QR scan, and an owner mobile app.',
      primaryCta: 'Book Your 15-Min Live Demo',
      secondaryCta: 'WhatsApp Sales Team',
      whatsappMessage:
        'Hello, I visited the P.T.A website and would like to book a live demo for our clinic.',
      proofChips: [
        'Works Even Without Internet',
        'Manage One or Multiple Branches',
        'Instant Arabic & English Switch',
        'Patient Portal via 1 QR Scan',
      ],
    },
    showcase: {
      windowSubtitle: 'Inside P.T.A — Your Daily Clinic Workspace',
      liveIndicator: 'Synced Live',
      tabs: [
        {
          id: 'command',
          label: 'Clinic Overview',
          shortLabel: 'Overview',
          badge: 'Daily / Weekly / Monthly',
          headline: 'Real-Time Clinic Pulse & Reception Queue',
          caption:
            'Monitor waiting patients, live treatment room timers, and daily, weekly, or monthly collections from one clean screen.',
        },
        {
          id: 'clinical',
          label: 'Patient File & Smart Assistant',
          shortLabel: 'Patient File',
          badge: 'Smart Assistant',
          headline: 'Complete Rehab, Nutrition & Doctor Signature Files',
          caption:
            'Log physical therapy progress, nutrition & meal plans, InBody measurements, automatic doctor signatures on PDFs, and smart rehab insights.',
        },
        {
          id: 'portal',
          label: 'Patient Portal & Clinic Offers',
          shortLabel: 'Patient Portal',
          badge: '1 QR Scan',
          headline: 'Home Exercise Portal & Clinic Promotions',
          caption:
            'Patients scan one QR code to follow home exercises, report daily pain levels, view upcoming visits, and see your clinic offers.',
        },
        {
          id: 'finance',
          label: 'Doctor Payroll & Owner App',
          shortLabel: 'Payroll + Mobile',
          badge: 'Zero Leaks',
          headline: 'Automatic Doctor Commissions & Owner Mobile App',
          caption:
            'Calculate doctor session payouts automatically, deduct staff salary advances accurately, and check branch performance from your phone.',
        },
      ],
      command: {
        rangeLabels: ['Today', '7 Days', '30 Days'],
        kpis: [
          { label: 'Daily Queue', values: ['18', '114', '486'], delta: '+14%' },
          { label: 'Active Patients', values: ['9', '12', '15'], delta: 'Live' },
          { label: 'Collected Revenue', values: ['EGP 14,200', 'EGP 88,500', 'EGP 342,000'], delta: '+22%' },
        ],
        queueTitle: 'Live Reception Queue',
        queuePatients: [
          { name: 'Sarah Abdelaziz', therapy: 'Lower Back Rehab • Session 4/8', status: 'In Room', duration: '24:12' },
          { name: 'Mohamed El-Sayed', therapy: 'Knee Rehab • Session 6/12', status: 'Checked In', duration: 'Next' },
          { name: 'Reem Adel', therapy: 'Nutrition + InBody Follow-Up', status: 'Completed', duration: 'Signed' },
        ],
        timerLabel: 'Active Session Timer',
        timerValue: '00:24:12',
      },
      clinical: {
        patientName: 'Reem Adel — File #PT-4092',
        patientMeta: 'Neck & Posture Program • Package 6/12 Sessions • Maadi Branch',
        sections: [
          { title: 'Physical Therapy Assessment', summary: 'Safety screening cleared • Mobility & manual exam logged', metric: 'Pain 3/10' },
          { title: 'Nutrition & Meal Plan', summary: '1,950 kcal daily plan • Easy meal swaps & branded PDF', metric: 'InBody Saved' },
          { title: 'Automatic Doctor Signature', summary: 'Applied automatically on clinical & nutrition reports', metric: 'Verified' },
        ],
        copilotTitle: 'Smart Clinical Assistant',
        copilotShortcut: '1-Click',
        copilotBadge: 'Clinical Insights',
        copilotPrompt: 'Summarize this month’s patient adherence and pain alerts',
        copilotReply:
          'Package completion rose 18% this month. Two neck-rehab patients logged pain 6/10 or higher at home — ready for doctor review.',
      },
      portal: {
        clinicName: 'Your Clinic Patient Portal',
        bannerTag: 'Clinic Offer',
        bannerTitle: 'Posture & Spine Recovery Package',
        bannerSubtitle: '12 sessions + InBody assessment + custom home exercise plan',
        screens: [
          { title: 'Home Exercises', detail: '4 video-guided drills • 3 sets x 12 reps' },
          { title: 'Nutrition & Meals', detail: 'Daily meal schedule with easy alternatives' },
          { title: 'My Appointments', detail: 'Next visit: Tuesday 4:30 PM • Dr. Karim' },
        ],
        checkinLabel: 'Daily Pain Check-In Received',
        checkinScore: 'Pain 2/10 • Steady Improvement',
      },
      finance: {
        revenueLabel: 'Monthly Collected Revenue',
        revenueValue: 'EGP 342,000',
        netProfitLabel: 'Net Clinic Profit',
        netProfitValue: 'EGP 218,400',
        payrollTitle: 'Automatic Doctor Commissions & Salary Advances',
        doctors: [
          { name: 'Dr. Karim Hassan', sessions: '64 Sessions', commission: 'EGP 28,800', loanNote: 'Advance -2,000 auto-deducted' },
          { name: 'Dr. Salma Nabil', sessions: '52 Sessions', commission: 'EGP 23,400', loanNote: 'No pending deductions' },
        ],
        mobileCompanionTitle: 'Owner Mobile App',
        mobilePrompt: '"How did Maadi branch perform today?"',
        mobileReply: '18 sessions completed • EGP 14,200 collected • 0 unpaid packages.',
      },
    },
    ecosystem: {
      eyebrow: 'Four Connected Tools',
      title: 'One Platform for Your Desk, Patients, Doctors & Owners',
      subtitle:
        'Designed so your front desk, physiotherapists, nutritionists, patients, and clinic owners stay aligned automatically without spreadsheets.',
      banner: {
        eyebrow: 'Designed Around Real Treatment Rooms',
        headline: 'Less desk friction for your team, clearer recovery for your patients.',
        stats: ['Zero Paper Files', '1-Click Doctor Payroll', 'No App Download for Patients'],
      },
      pillars: [
        {
          id: 'desktop',
          tag: 'Always Fast, Even Offline',
          title: 'Clinic Command Center',
          description:
            'Your front desk and treatment rooms keep running at full speed even if clinic internet drops, then back up automatically when reconnected.',
          highlights: ['Daily, Weekly & Monthly Views', 'Live Patient Waiting Queue', 'Automatic Cloud Backup'],
        },
        {
          id: 'portal',
          tag: 'No App Download Needed',
          title: 'Patient Home Portal',
          description:
            'Patients scan one QR card with their personal PIN to follow home exercises, view meal plans, check appointment times, and see clinic offers.',
          highlights: ['Exercises, Meals & Schedule', 'Daily Pain Feedback Loop', 'Promotional Clinic Banners'],
        },
        {
          id: 'mobile',
          tag: 'iOS & Android',
          title: 'Owner Mobile App',
          description:
            'Stay updated on every branch from anywhere using voice or text questions to check today’s revenue, active patients, and doctor output.',
          highlights: ['Pairs with Your Clinic in Seconds', 'Live Branch Performance', 'Voice & Text Quick Questions'],
        },
        {
          id: 'ai',
          tag: 'Smart Assistant',
          title: 'Clinical & Admin Co-Pilot',
          description:
            'Get instant help drafting personalized rehab & nutrition plans or summarizing monthly revenue, attendance, and doctor productivity.',
          highlights: ['Rehab Exercise Suggestions', 'Smart Meal & Diet Alternatives', 'Instant Management Summaries'],
        },
      ],
    },
    features: {
      eyebrow: 'Built for Every Clinic Department',
      title: 'Everything Required to Run an Elite Physical Therapy Practice',
      subtitle:
        'Every capability is tailored around real physiotherapy, sports rehabilitation, therapeutic nutrition, and multi-branch clinic operations.',
      cards: [
        {
          id: 'profiles',
          category: 'Patient Records',
          title: 'PT, Nutrition & Lymphatic Files',
          description:
            'Organized clinical screening, joint mobility & strength progress, lymphatic measurements, and structured session-by-session treatment plans.',
          badge: 'Updated',
        },
        {
          id: 'nutrition',
          category: 'Nutrition & PDFs',
          title: 'Meal Plans, InBody & Signed Reports',
          description:
            'Build custom nutrition plans, swap foods in one click, attach InBody sheets, and print branded PDF reports with automatic doctor signatures.',
          badge: 'New',
        },
        {
          id: 'commissions',
          category: 'Financial Control',
          title: 'Doctor Commissions & Salary Advances',
          description:
            'Track package sessions accurately, calculate each doctor’s commission automatically, settle staff salary advances, and record daily expenses.',
        },
        {
          id: 'queue',
          category: 'Front Desk',
          title: 'Live Waiting Queue & Session Timer',
          description:
            'Guide patients smoothly from arrival to treatment rooms with live session stopwatches, staff check-in tracking, and instant doctor assignment.',
        },
        {
          id: 'whatsapp',
          category: 'Patient Engagement',
          title: '1-Click WhatsApp & Clinic Offers',
          description:
            'Send formatted appointment reminders or review links via WhatsApp and showcase your clinic’s packages directly inside the patient portal.',
          badge: 'Patient Growth',
        },
        {
          id: 'branches',
          category: 'Multi-Branch',
          title: 'Manage Multiple Branches Easily',
          description:
            'Separate each branch’s daily queue and accounts while giving owners an instant switch to compare performance across all locations.',
        },
        {
          id: 'security',
          category: 'Accountability',
          title: 'Role Permissions & Full Change Log',
          description:
            'Control exactly what receptionists, doctors, accountants, and managers can view or edit, with an automatic history log on every payment.',
        },
        {
          id: 'bilingual',
          category: 'Bilingual Experience',
          title: 'Instant Arabic & English Switch',
          description:
            'Flip every screen, patient printout, and portal view cleanly between Arabic and English in a single click.',
          badge: 'Arabic + English',
        },
      ],
    },
    workflow: {
      eyebrow: 'Day-to-Day Clinic Flow',
      title: 'How Leading Clinics Operate on P.T.A',
      subtitle:
        'From the moment a patient checks in until home recovery and month-end doctor payouts — every step flows automatically into the next.',
      steps: [
        {
          step: '01',
          title: 'Reception, Packages & Queue',
          subtitle: 'Front Desk',
          description:
            'Register patients, activate treatment packages, schedule visits, and guide cases smoothly through the live waiting queue.',
        },
        {
          step: '02',
          title: 'Assessment & Smart Assistant',
          subtitle: 'Treatment Room',
          description:
            'Log physical therapy progress, InBody sheets, or meal plans with live session timers and automatic doctor PDF signatures.',
        },
        {
          step: '03',
          title: 'QR Patient Portal at Home',
          subtitle: 'Between Visits',
          description:
            'Patients scan one QR code to follow home exercises, share daily pain updates, and discover your clinic’s latest offers.',
        },
        {
          step: '04',
          title: 'Commissions & Owner Updates',
          subtitle: 'Management',
          description:
            'Net profit, doctor payouts, and advance deductions update automatically — and owners can check branch totals from their phone.',
        },
      ],
      videoCard: {
        badge: 'Live Walkthrough',
        title: 'See Every Screen Working on a Real Clinic Day',
        description:
          'In 15 minutes, we show clinic owners and medical directors the front desk queue, doctor files, automatic commissions, patient portal, and mobile owner app.',
        duration: '15-Minute Personalized Demo',
        cta: 'Schedule Your Walkthrough',
        previewActionLabel: 'Book Your 15-Min Live Walkthrough',
      },
    },
    plans: {
      eyebrow: 'Clinic Editions',
      title: 'Built to Fit Every Stage of Your Practice',
      subtitle:
        'Start with one busy rehabilitation clinic or unify multiple branches under a single medical and financial system.',
      popularBadge: 'Most Popular',
      tiers: [
        {
          id: 'single',
          name: 'Single Clinic Edition',
          tagline: 'Ideal for independent physiotherapy & sports rehab centers',
          idealFor: '1 Branch • Complete Clinical & Financial Core',
          ctaLabel: 'Book Demo for Single Clinic',
          highlights: [
            'Fast clinic software with instant Arabic & English switch',
            'Physical therapy, nutrition, lymphatic & InBody records',
            'QR Patient Portal for home exercises & pain feedback',
            'Automatic doctor commissions, payroll & signed PDF reports',
          ],
        },
        {
          id: 'multi',
          name: 'Multi-Branch Suite',
          tagline: 'Built for clinics expanding across multiple locations',
          idealFor: '2–5 Branches • Cloud Sync + Smart Assistant + Mobile',
          ctaLabel: 'Book Demo for Multi-Branch',
          popular: true,
          highlights: [
            'Everything in Single Clinic Edition',
            'Multi-branch cloud sync with instant branch switcher',
            'Owner Mobile App for live branch revenue & voice queries',
            'Smart Clinical Assistant & Patient Portal promotional banners',
          ],
        },
        {
          id: 'enterprise',
          name: 'Medical Centers & Networks',
          tagline: 'Custom rollout & staff training for large medical groups',
          idealFor: '5+ Branches • Tailored Onboarding & Support',
          ctaLabel: 'Talk to Our Team',
          highlights: [
            'Centralized financial oversight & full multi-branch audit log',
            'Assisted migration of existing patient records & team training',
            'Dedicated WhatsApp channel & priority support',
            'Custom clinic domain setup for your patient portal',
          ],
        },
      ],
    },
    demo: {
      eyebrow: 'Book a Live Demo',
      title: 'Ready to Simplify and Grow Your Clinic?',
      subtitle:
        'Share your clinic details below and our team will reach out quickly via email and WhatsApp to arrange your private live session.',
      photoBannerTitle: 'Live 1-on-1 Clinic Walkthrough',
      photoBannerSubtitle: 'Tailored to your branches, team roles & patient flow',
      directTitle: 'Direct Contact Channels',
      directWhatsappLabel: 'WhatsApp & Calls',
      directEmailLabel: 'Email',
      coversTitle: 'What Your 15-Minute Live Demo Covers',
      covers: [
        'Live walkthrough of the reception queue, daily/weekly/monthly stats & doctor files',
        'Hands-on preview of the QR Patient Portal and clinic promotional offers',
        'Reviewing automatic doctor commissions, salary advances & multi-branch setup',
      ],
      form: {
        clinicNameLabel: 'Clinic / Center Name *',
        clinicNamePlaceholder: 'e.g. Prime Physical Therapy Center',
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
          { value: 'Medical Centers & Networks', label: 'Medical Centers & Networks' },
        ],
        modulesLabel: 'What Would You Like to See First?',
        moduleOptions: [
          { id: 'Command Center & Queue', label: 'Reception & Live Queue' },
          { id: 'PT & Nutrition Profiles', label: 'PT & Nutrition Files' },
          { id: 'Doctor Commissions & Payroll', label: 'Doctor Commissions' },
          { id: 'Patient Portal (QR + PIN)', label: 'Patient Portal' },
          { id: 'Smart Clinical Assistant', label: 'Smart Assistant' },
          { id: 'Owner Mobile App', label: 'Owner Mobile App' },
        ],
        notesLabel: 'Notes or Clinic Goals (Optional)',
        notesPlaceholder: 'Tell us about your team size, branches, or what you want to improve...',
        submitBtn: 'Request Live Demo',
        submittingBtn: 'Submitting Request...',
        privacyNote: 'Your details stay strictly private — confirmation sent directly to your email.',
        validationError: 'Please fill in your clinic name, name, email, and WhatsApp number.',
      },
      success: {
        title: 'Demo Request Confirmed!',
        subtitle:
          'We received your request and sent a confirmation email. Our team will message you shortly to pick a convenient time.',
        referenceLabel: 'Reference ID',
        whatsappFollowUp: 'Message Us on WhatsApp Now',
        whatsappPrefillPrefix: 'Hello! I just submitted a live demo request for',
        submitAnother: 'Submit Another Request',
      },
    },
    footer: {
      tagline:
        'Complete clinic management platform built for modern physical therapy, sports rehabilitation, and therapeutic nutrition centers.',
      linksTitle: 'Sections',
      contactTitle: 'Contact & Website',
      copyright: 'All rights reserved.',
      domainLabel: 'Official Website',
    },
    whatsappFloat: {
      label: 'Chat on WhatsApp',
      prefill: 'Hello, I would like to learn more about P.T.A and book a live demo for our clinic.',
    },
  },
  ar: {
    meta: {
      pageTitle: 'P.T.A — منظومة إدارة عيادات العلاج الطبيعي والتأهيل',
    },
    nav: {
      ecosystem: 'المنظومة',
      features: 'المزايا',
      workflow: 'كيف يعمل',
      plans: 'الباقات',
      bookDemo: 'احجز عرضاً مباشراً',
      whatsapp: 'واتساب',
      langSwitch: 'English',
    },
    hero: {
      releasePill: 'مصمم خصيصاً لمراكز العلاج الطبيعي والتأهيل',
      headlineStart: 'أدِر ',
      headlineHighlight: 'عيادة العلاج الطبيعي',
      headlineEnd: ' باحترافية كاملة دون ملفات ورقية أو تسرب مالي.',
      subheadline:
        'كل ما يحتاجه مركزك في مكان واحد: شاشة استقبال حية، ملفات العلاج الطبيعي والتغذية، حساب تلقائي لعمولات الأطباء، مساعد سريري ذكي، بوابة للمريض عبر رمز QR، وتطبيق جوال لمالك العيادة.',
      primaryCta: 'احجز عرضاً مباشراً (15 دقيقة)',
      secondaryCta: 'تواصل عبر واتساب',
      whatsappMessage:
        'مرحباً، زرت موقع منظومة P.T.A وأرغب في حجز عرض تجريبي مباشر لعيادتنا.',
      proofChips: [
        'يعمل بكفاءة حتى عند انقطاع الإنترنت',
        'إدارة فرع واحد أو عدة فروع بسهولة',
        'تبديل فوري بين العربية والإنجليزية',
        'بوابة للمريض بمسحة QR واحدة',
      ],
    },
    showcase: {
      windowSubtitle: 'جولة داخل منظومة P.T.A — مساحة العمل اليومية',
      liveIndicator: 'المزامنة نشطة',
      tabs: [
        {
          id: 'command',
          label: 'لوحة العيادة',
          shortLabel: 'نظرة عامة',
          badge: 'يومي / أسبوعي / شهري',
          headline: 'متابعة حية للعيادة وقائمة الانتظار بالاستقبال',
          caption:
            'راقب حركة المرضى، ومؤقت الجلسات المباشر، والتحصيلات اليومية أو الأسبوعية أو الشهرية من شاشة واحدة واضحة.',
        },
        {
          id: 'clinical',
          label: 'ملف المريض والمساعد الذكي',
          shortLabel: 'ملف المريض',
          badge: 'مساعد ذكي',
          headline: 'ملفات التأهيل والتغذية وتوقيع الطبيب التلقائي',
          caption:
            'سجل تقييم العلاج الطبيعي، خطط التغذية وبدائل الوجبات، قياسات InBody، توقيع الطبيب التلقائي على التقارير، وتوصيات المساعد الذكي.',
        },
        {
          id: 'portal',
          label: 'بوابة المريض وعروض العيادة',
          shortLabel: 'بوابة المريض',
          badge: 'بمسحة QR',
          headline: 'بوابة التمارين المنزلية وعروض المركز للمريض',
          caption:
            'يمسح المريض رمز QR لمتابعة تمارينه المنزلية، تسجيل مستوى الألم اليومي، معرفة مواعيده القادمة، ومشاهدة عروض العيادة.',
        },
        {
          id: 'finance',
          label: 'حسابات الأطباء وتطبيق المالك',
          shortLabel: 'الحسابات + الجوال',
          badge: 'صفر تسرب مالي',
          headline: 'عمولات الأطباء التلقائية وتطبيق المالك على الجوال',
          caption:
            'احسب نسب الأطباء عن كل جلسة تلقائياً، واخصم سلف الرواتب بدقة، وتابع أداء جميع الفروع من هاتفك في أي وقت.',
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
          { name: 'سارة عبد العزيز', therapy: 'تأهيل أسفل الظهر • جلسة 4/8', status: 'داخل الجلسة', duration: '24:12' },
          { name: 'محمد السيد', therapy: 'تأهيل الركبة • جلسة 6/12', status: 'تم الحضور', duration: 'التالي' },
          { name: 'ريم عادل', therapy: 'متابعة تغذية + InBody', status: 'مكتمل', duration: 'موقّع' },
        ],
        timerLabel: 'مؤقت الجلسة النشطة',
        timerValue: '00:24:12',
      },
      clinical: {
        patientName: 'ريم عادل — ملف #PT-4092',
        patientMeta: 'برنامج الرقبة والقوام • باقة 6 من 12 جلسة • فرع المعادي',
        sections: [
          { title: 'تقييم العلاج الطبيعي', summary: 'فحص السلامة مكتمل • قياس الحركة والفحص اليدوي مسجل', metric: 'الألم 3/10' },
          { title: 'التغذية وبدائل الوجبات', summary: 'خطة 1,950 سعرة • تبديل أصناف سهل وتقرير PDF باسم العيادة', metric: 'تم حفظ InBody' },
          { title: 'توقيع الطبيب التلقائي', summary: 'يُضاف تلقائياً على جميع تقارير العلاج والتغذية', metric: 'موثّق' },
        ],
        copilotTitle: 'المساعد السريري الذكي',
        copilotShortcut: 'بنقرة واحدة',
        copilotBadge: 'توصيات ذكية',
        copilotPrompt: 'لخّص التزام المرضى هذا الشهر وأهم تنبيهات الألم',
        copilotReply:
          'ارتفع معدل إتمام الباقات بنسبة 18% هذا الشهر. هناك حالتان سجلتا ألم 6/10 أو أعلى في المنزل — جاهز لمراجعة الطبيب.',
      },
      portal: {
        clinicName: 'بوابة المريض الخاصة بعيادتك',
        bannerTag: 'عرض العيادة',
        bannerTitle: 'باقة تأهيل العمود الفقري المتكاملة',
        bannerSubtitle: '12 جلسة علاج طبيعي + قياس InBody + برنامج تمارين منزلي',
        screens: [
          { title: 'التمارين المنزلية', detail: '4 تمارين موضحة بالفيديو • 3 مجموعات × 12 عدة' },
          { title: 'التغذية والوجبات', detail: 'جدول وجبات يومي مع بدائل أطعمة مرنة' },
          { title: 'جدول المواعيد', detail: 'الجلسة القادمة: الثلاثاء 4:30 م • د. كريم' },
        ],
        checkinLabel: 'تم استلام تقييم الألم اليومي',
        checkinScore: 'الألم 2/10 • تحسن مستمر',
      },
      finance: {
        revenueLabel: 'الإيراد الشهري المحقق',
        revenueValue: '342,000 ج.م',
        netProfitLabel: 'صافي ربح العيادة',
        netProfitValue: '218,400 ج.م',
        payrollTitle: 'عمولات الأطباء التلقائية وسجل السلف',
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
      eyebrow: 'أربع أدوات مترابطة',
      title: 'منظومة واحدة للاستقبال، المرضى، الأطباء، ومالك العيادة',
      subtitle:
        'مصممة ليعمل فريق الاستقبال والأطباء وأخصائيو التغذية والمرضى ومالك العيادة بتناغم لحظي دون جداول معقدة.',
      banner: {
        eyebrow: 'مصمم حول واقع غرف العلاج',
        headline: 'عمل أسرع لفريقك داخل العيادة، ومتابعة أوضح لتعافي مرضاك.',
        stats: ['صفر ملفات ورقية', 'كشف عمولات الأطباء بضغطة زر', 'دون تحميل أي تطبيق للمريض'],
      },
      pillars: [
        {
          id: 'desktop',
          tag: 'سريع دائماً حتى بدون إنترنت',
          title: 'مركز القيادة بالعيادة',
          description:
            'يستمر الاستقبال وغرف العلاج في العمل بأقصى سرعة حتى لو ضعف أو انقطع الإنترنت، مع حفظ احتياطي سحابي تلقائي.',
          highlights: ['تقارير يومية وأسبوعية وشهرية', 'شاشة انتظار الاستقبال الحية', 'نسخ احتياطي سحابي تلقائي'],
        },
        {
          id: 'portal',
          tag: 'بدون تحميل أي تطبيق',
          title: 'بوابة المريض المنزلية',
          description:
            'يمسح المريض بطاقة QR الخاصة به مع رمز سري ليصل إلى تمارينه المنزلية، نظامه الغذائي، مواعيده، وعروض المركز.',
          highlights: ['التمارين والوجبات والمواعيد', 'متابعة مستوى الألم يومياً', 'عرض باقات وعروض العيادة'],
        },
        {
          id: 'mobile',
          tag: 'لأجهزة iOS و Android',
          title: 'تطبيق نبض المالك',
          description:
            'تابع أداء فروعك من أي مكان عبر أسئلة نصية أو صوتية تعرض لك إجمالي التحصيلات وعدد الجلسات وإنتاجية الأطباء فوراً.',
          highlights: ['ربط آمن بالعيادة خلال ثوانٍ', 'متابعة إيراد كل فرع مباشرة', 'استعلامات صوتية ونصية سريعة'],
        },
        {
          id: 'ai',
          tag: 'مساعد سريري ذكي',
          title: 'دعم الطبيب والإدارة',
          description:
            'احصل على اقتراحات سريعة لخطط التأهيل والتغذية أو ملخصات فورية للأرباح وحضور الفريق وإنتاجية الأطباء.',
          highlights: ['اقتراح برامج تمارين وتأهيل', 'خطط تغذية وبدائل وجبات', 'ملخصات إدارية ومالية فورية'],
        },
      ],
    },
    features: {
      eyebrow: 'مصمم لكل أقسام العيادة',
      title: 'كل ما تحتاجه لإدارة عيادة علاج طبيعي حديثة',
      subtitle:
        'كل أداة في المنظومة بُنيت استناداً إلى سير العمل الفعلي داخل مراكز العلاج الطبيعي، إصابات الملاعب، والتغذية العلاجية.',
      cards: [
        {
          id: 'profiles',
          category: 'ملفات المرضى',
          title: 'ملفات العلاج الطبيعي والتغذية والليمفاوي',
          description:
            'فحص طبي منظم، متابعة تطور الحركة والقوة العضلية، القياسات الليمفاوية، وخطط الجلسات المتسلسلة لكل حالة.',
          badge: 'محدّث',
        },
        {
          id: 'nutrition',
          category: 'التغذية والتقارير',
          title: 'خطط الوجبات و InBody وتقارير موقّعة',
          description:
            'أنشئ خططاً غذائية مرنة مع تبديل الأصناف بضغطة زر، واحفظ قياسات InBody، واطبع تقارير PDF تحمل توقيع الطبيب تلقائياً.',
          badge: 'جديد',
        },
        {
          id: 'commissions',
          category: 'الرقابة المالية',
          title: 'عمولات الأطباء وخصم سلف الرواتب',
          description:
            'تابع استهلاك جلسات الباقات بدقة، واحسب نسبة كل طبيب تلقائياً، وسوِّ سلف الموظفين والمصروفات اليومية دون أخطاء.',
        },
        {
          id: 'queue',
          category: 'مكتب الاستقبال',
          title: 'قائمة الانتظار الحية ومؤقت الجلسة',
          description:
            'نظّم دخول المرضى من لحظة الوصول إلى غرف العلاج مع مؤقت حي لكل جلسة، وتسجيل حضور الفريق، وتوزيع الحالات على الأطباء.',
        },
        {
          id: 'whatsapp',
          category: 'تواصل المرضى',
          title: 'تذكيرات واتساب بنقرة وعروض العيادة',
          description:
            'أرسل تذكيرات المواعيد أو روابط التقييم عبر واتساب فوراً، واعرض باقات وعروض عيادتك داخل بوابة المريض.',
          badge: 'نمو العيادة',
        },
        {
          id: 'branches',
          category: 'تعدد الفروع',
          title: 'إدارة أكثر من فرع من مكان واحد',
          description:
            'افصل حركة الاستقبال والحسابات لكل فرع بوضوح، مع إمكانية تنقل المالك بين الفروع ومقارنة أدائها بضغطة زر.',
        },
        {
          id: 'security',
          category: 'الحوكمة والأمان',
          title: 'صلاحيات دقيقة وسجل متابعة كامل',
          description:
            'حدد بدقة ما يراه أو يعدّله الاستقبال والأطباء والمحاسبون، مع سجل حفظ تلقائي لأي تعديل في المدفوعات أو الجلسات.',
        },
        {
          id: 'bilingual',
          category: 'تجربة ثنائية اللغة',
          title: 'تحويل فوري بين العربية والإنجليزية',
          description:
            'بدّل جميع الشاشات، وتقارير المرضى المطبوعة، وبوابة المريض بين العربية والإنجليزية في لحظة واحدة.',
          badge: 'عربي + إنجليزي',
        },
      ],
    },
    workflow: {
      eyebrow: 'دورة العمل اليومية',
      title: 'كيف تعمل العيادات المتطورة مع منظومة P.T.A',
      subtitle:
        'من لحظة تسجيل المريض بالاستقبال حتى متابعة تمارينه في المنزل وإغلاق حسابات الأطباء نهاية الشهر — كل خطوة تتكامل تلقائياً.',
      steps: [
        {
          step: '01',
          title: 'الاستقبال، الباقات وقائمة الانتظار',
          subtitle: 'مكتب الاستقبال',
          description:
            'تسجيل المريض، تفعيل باقة الجلسات، جدولة المواعيد، وتوجيه الحالات بسلاسة عبر قائمة الانتظار الحية.',
        },
        {
          step: '02',
          title: 'التقييم الطبي والمساعد الذكي',
          subtitle: 'غرفة العلاج',
          description:
            'توثيق تقدم العلاج الطبيعي، وقياسات InBody، أو خطط الوجبات مع مؤقت الجلسة وتوقيع الطبيب التلقائي على التقارير.',
        },
        {
          step: '03',
          title: 'بوابة المريض عبر رمز QR',
          subtitle: 'بين الجلسات',
          description:
            'يمسح المريض الرمز ليتابع تمارينه المنزلية، يشارك مستوى الألم اليومي، ويشاهد أحدث عروض العيادة.',
        },
        {
          step: '04',
          title: 'العمولات وتقارير المالك',
          subtitle: 'الإدارة',
          description:
            'تُحتسب صافي الأرباح وعمولات الأطباء والخصومات تلقائياً مع متابعة فورية عبر تطبيق المالك على الجوال.',
        },
      ],
      videoCard: {
        badge: 'عرض حي مباشر',
        title: 'شاهد كل شاشة تعمل فعلياً على يوم عمل حقيقي بالعيادة',
        description:
          'في 15 دقيقة نستعرض لمالكي العيادات والمديرين الطبيين شاشة الاستقبال، ملفات الأطباء، العمولات التلقائية، بوابة المريض، وتطبيق المالك.',
        duration: 'جلسة عرض مخصصة — 15 دقيقة',
        cta: 'احجز جولتك الآن',
        previewActionLabel: 'احجز جولة مباشرة لمدة 15 دقيقة',
      },
    },
    plans: {
      eyebrow: 'إصدارات العيادات',
      title: 'اختر النسخة المناسبة لحجم عيادتك',
      subtitle:
        'ابدأ بعيادة علاج طبيعي واحدة متكاملة أو وحّد عدة فروع تحت منظومة طبية ومالية وسحابية واحدة.',
      popularBadge: 'الأكثر طلباً',
      tiers: [
        {
          id: 'single',
          name: 'نسخة العيادة الواحدة',
          tagline: 'مثالية لمراكز العلاج الطبيعي والتأهيل المستقلة',
          idealFor: 'فرع واحد • النظام الطبي والمالي الكامل',
          ctaLabel: 'اطلب عرضاً للعيادة الواحدة',
          highlights: [
            'برنامج سريع للعيادة مع تبديل فوري بين العربية والإنجليزية',
            'ملفات العلاج الطبيعي والتغذية والليمفاوي و InBody',
            'بوابة المريض برمز QR للتمارين المنزلية ومتابعة الألم',
            'عمولات الأطباء التلقائية والرواتب وتقارير PDF الموقّعة',
          ],
        },
        {
          id: 'multi',
          name: 'باقة الفروع المتعددة',
          tagline: 'مصممة للمراكز المتوسعة في أكثر من فرع',
          idealFor: '2–5 فروع • مزامنة سحابية + مساعد ذكي + تطبيق المالك',
          ctaLabel: 'اطلب عرضاً للفروع المتعددة',
          popular: true,
          highlights: [
            'جميع مزايا نسخة العيادة الواحدة',
            'مزامنة سحابية بين الفروع وتبديل فوري لإدارة المالك',
            'تطبيق المالك على الجوال لمتابعة الإيرادات والأوامر الصوتية',
            'المساعد السريري الذكي وعرض باقات المركز في بوابة المريض',
          ],
        },
        {
          id: 'enterprise',
          name: 'المجمعات الطبية والشبكات',
          tagline: 'تشغيل مخصص وتدريب شامل للمجموعات الطبية الكبيرة',
          idealFor: '+5 فروع • تهيئة وتدريب مخصص',
          ctaLabel: 'تواصل مع فريق التشغيل',
          highlights: [
            'رقابة مالية مركزية وسجل متابعة كامل لكل الفروع',
            'المساعدة في نقل سجلات المرضى الحالية وتدريب الفريق',
            'قناة دعم مباشر وأولوية عبر واتساب',
            'ربط نطاق باسم مركزك لبوابة المرضى الإلكترونية',
          ],
        },
      ],
    },
    demo: {
      eyebrow: 'احجز عرضاً مباشراً',
      title: 'هل أنت جاهز لتطوير إدارة عيادتك؟',
      subtitle:
        'سجّل بيانات عيادتك أدناه وسيتواصل معك فريقنا سريعاً عبر البريد والواتساب لتنسيق جلسة عرض حية ومخصصة.',
      photoBannerTitle: 'عرض مباشر مخصص لعيادتك',
      photoBannerSubtitle: 'مصمم حسب عدد الفروع وفريق الأطباء وطريقة عملك',
      directTitle: 'قنوات التواصل المباشر',
      directWhatsappLabel: 'واتساب والاتصال',
      directEmailLabel: 'البريد الإلكتروني',
      coversTitle: 'ماذا ستشاهد في جلسة الـ 15 دقيقة؟',
      covers: [
        'جولة حية في شاشة الاستقبال، الإحصائيات اليومية والأسبوعية والشهرية، وملفات الأطباء',
        'تجربة عملية لبوابة المريض برمز QR وعرض باقات العيادة الترويجية',
        'شرح آلية حساب عمولات الأطباء تلقائياً، خصم السلف، والربط بين الفروع',
      ],
      form: {
        clinicNameLabel: 'اسم العيادة أو المركز *',
        clinicNamePlaceholder: 'مثال: مركز برايم للعلاج الطبيعي',
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
          { value: 'Medical Centers & Networks', label: 'المجمعات الطبية والشبكات' },
        ],
        modulesLabel: 'الأقسام التي ترغب في رؤيتها أولاً',
        moduleOptions: [
          { id: 'Command Center & Queue', label: 'الاستقبال وقائمة الانتظار' },
          { id: 'PT & Nutrition Profiles', label: 'ملفات العلاج والتغذية' },
          { id: 'Doctor Commissions & Payroll', label: 'عمولات الأطباء والرواتب' },
          { id: 'Patient Portal (QR + PIN)', label: 'بوابة المريض (QR)' },
          { id: 'Smart Clinical Assistant', label: 'المساعد الذكي' },
          { id: 'Owner Mobile App', label: 'تطبيق المالك' },
        ],
        notesLabel: 'ملاحظات أو أهداف العيادة (اختياري)',
        notesPlaceholder: 'أخبرنا عن عدد الأطباء أو الفروع أو ما تود تحسينه في عيادتك...',
        submitBtn: 'إرسال طلب العرض المباشر',
        submittingBtn: 'جاري إرسال الطلب...',
        privacyNote: 'بياناتك سرية بالكامل — ستصلك رسالة تأكيد مباشرة على بريدك الإلكتروني.',
        validationError: 'يرجى كتابة اسم العيادة واسمك والبريد الإلكتروني ورقم الواتساب بشكل صحيح.',
      },
      success: {
        title: 'تم تأكيد طلب العرض بنجاح!',
        subtitle:
          'تم استلام طلبك وإرسال رسالة تأكيد على بريدك الإلكتروني. سيتواصل معك فريقنا قريباً لاختيار الموعد المناسب.',
        referenceLabel: 'رقم المرجع',
        whatsappFollowUp: 'تواصل الآن عبر واتساب لتسريع الموعد',
        whatsappPrefillPrefix: 'مرحباً! قمت للتو بإرسال طلب عرض تجريبي لعيادة',
        submitAnother: 'إرسال طلب آخر',
      },
    },
    footer: {
      tagline:
        'منظومة إدارة عيادات متكاملة مصممة لمراكز العلاج الطبيعي، التأهيل الرياضي، والتغذية العلاجية.',
      linksTitle: 'أقسام الصفحة',
      contactTitle: 'التواصل والموقع',
      copyright: 'جميع الحقوق محفوظة.',
      domainLabel: 'الموقع الرسمي',
    },
    whatsappFloat: {
      label: 'تواصل واتساب',
      prefill: 'مرحباً، أود معرفة المزيد عن منظومة P.T.A وحجز عرض تجريبي لعيادتنا.',
    },
  },
};
