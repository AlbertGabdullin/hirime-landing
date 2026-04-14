export const en = {
  meta: {
    title: 'Hirime — AI-Powered Resume Builder',
    description:
      'Build your resume once. Let AI tailor it for every job application. Join the waitlist for early access.',
    ogTitle: 'Hirime — AI-Powered Resume Builder',
    ogDescription:
      'The resume that gets you hired. Build once, AI adapts for every role.',
  },
  nav: {
    howItWorks: 'How it works',
    features: 'Features',
    comingSoon: 'Coming soon',
    joinWaitlist: 'Join Waitlist',
  },
  hero: {
    prefix: 'The resume that gets you hired as a',
    roles: ['Developer', 'Designer', 'Manager', 'Marketer'],
    subheadline:
      'Build your resume once. Let AI tailor it for every job application.',
    emailPlaceholder: 'Enter your email address',
    cta: 'Join the Waitlist',
    socialProof: 'Be the first to know when we launch',
    successMessage: "You're on the list! We'll be in touch soon. 🎉",
  },
  howItWorks: {
    label: 'How it works',
    title: 'Three steps to your perfect resume',
    subtitle:
      'From a single profile to a perfectly tailored resume for every opportunity.',
    steps: [
      {
        emoji: '📝',
        number: '01',
        title: 'Fill in your experience',
        description:
          'Enter your skills, experience, and accomplishments once into your master profile.',
      },
      {
        emoji: '🤖',
        number: '02',
        title: 'AI adapts your resume',
        description:
          'Our AI reads the job description and tailors your resume to match it precisely.',
      },
      {
        emoji: '🚀',
        number: '03',
        title: 'Apply with confidence',
        description:
          'Send a perfectly optimized application and land more interviews.',
      },
    ],
  },
  features: {
    label: 'Features',
    title: 'Everything you need to land the job',
    subtitle:
      'Built for modern job seekers who want to work smarter, not harder.',
    cards: [
      {
        emoji: '✨',
        title: 'AI Resume Tailoring',
        description:
          'Automatically adapt your resume to any job description with precision keyword matching.',
        badge: null,
      },
      {
        emoji: '📄',
        title: 'Multiple Versions',
        description:
          'Create and manage tailored resume versions for different roles and industries.',
        badge: null,
      },
      {
        emoji: '🎯',
        title: 'ATS Optimized',
        description:
          'Pass applicant tracking systems with keyword-rich, properly formatted resumes.',
        badge: 'Coming soon',
      },
      {
        emoji: '🌍',
        title: 'Multilingual Resumes',
        description:
          'Generate your resume in multiple languages to unlock global job opportunities.',
        badge: null,
      },
    ],
  },
  comingSoon: {
    label: 'Coming soon',
    title: "We're building something amazing",
    subtitle:
      'Join our waitlist to get early access and shape the future of Hirime.',
    features: [
      {
        emoji: '📋',
        title: 'Resume Builder Form',
        description: 'A guided form to build and maintain your master resume profile.',
      },
      {
        emoji: '🔍',
        title: 'AI Job Matching',
        description: 'Discover jobs that match your unique skills and experience.',
      },
      {
        emoji: '📊',
        title: 'ATS Score Checker',
        description: 'See your resume score before you hit send.',
      },
      {
        emoji: '✉️',
        title: 'Cover Letter Generator',
        description: 'AI-written cover letters tailored to each role.',
      },
    ],
    cta: {
      eyebrow: 'Get early access',
      title: 'Be the first to know',
      description:
        'Join thousands of job seekers already waiting for Hirime to launch.',
      emailPlaceholder: 'Enter your email address',
      button: 'Join the Waitlist',
      successMessage: "You're on the list! We'll be in touch soon. 🎉",
    },
  },
  footer: {
    tagline: 'AI-powered resumes for every opportunity.',
    links: {
      privacy: 'Privacy Policy',
      terms: 'Terms',
      contact: 'Contact',
    },
    copyright: '© 2025 Hirime.com. All rights reserved.',
  },
} as const;

export type Translations = typeof en;
