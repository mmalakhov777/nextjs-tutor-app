import { ScenarioData } from '@/types/scenarios';
import { MegaphoneIcon } from 'lucide-react';

export const researchTheMarketingAgencyLandscape: ScenarioData = {
  id: "research-the-marketing-agency-landscape",
  title: "How to start a marketing business",
  description:
    "Learn how to start and grow a successful marketing agency, from market research to scaling your team and services.",
  icon: MegaphoneIcon,
  color: "#6B47DC",
  steps: [
    {
      title: "How to start a marketing business",
      description:
        "Understand the current state, growth, and opportunities in the marketing agency industry.",
      actions: [
        {
          label: "Industry overview",
          prompt:
            "What is the current landscape and growth outlook for marketing agencies?",
        },
        {
          label: "Identify industry trends",
          prompt:
            "What are the latest trends and technologies shaping the marketing agency sector?",
        },
        {
          label: "Assess market demand",
          prompt:
            "How do I determine if there is demand for a new marketing agency in my area or niche?",
        },
      ],
    },
    {
      title: "Define Your Agency’s Core",
      description:
        "Clarify your agency’s niche, target market, mission, vision, and unique selling proposition.",
      actions: [
        {
          label: "Choose a niche",
          prompt:
            "How do I select a profitable niche for my marketing agency?",
        },
        {
          label: "Define ideal client",
          prompt:
            "Can you help me create an ideal client profile for my agency?",
        },
        {
          label: "Write mission and vision",
          prompt:
            "How do I write a mission and vision statement for my marketing agency?",
        },
        {
          label: "Develop a USP",
          prompt:
            "How do I create a unique selling proposition for my agency?",
        },
      ],
    },
    {
      title: "Business Planning and Legal Setup",
      description:
        "Develop a business plan and establish the legal and financial foundation for your agency.",
      actions: [
        {
          label: "Create a business plan",
          prompt:
            "What should I include in a business plan for a marketing agency?",
        },
        {
          label: "Choose legal structure",
          prompt:
            "What legal structure is best for a new marketing agency?",
        },
        {
          label: "Register the business",
          prompt:
            "What steps do I need to take to register my marketing agency?",
        },
        {
          label: "Understand tax obligations",
          prompt:
            "What are the basic tax requirements for a marketing agency?",
        },
      ],
    },
    {
      title: "Craft Your Service Offerings and Pricing",
      description:
        "Define your agency’s services, specializations, and pricing models.",
      actions: [
        {
          label: "Select service offerings",
          prompt:
            "What marketing services should my agency offer based on current demand?",
        },
        {
          label: "Specialize or generalize",
          prompt:
            "Should my agency focus on a specialization or offer a full suite of services?",
        },
        {
          label: "Set pricing models",
          prompt:
            "What are the most effective pricing models for marketing agencies?",
        },
        {
          label: "Create service packages",
          prompt:
            "How do I develop service packages and tiers for my agency?",
        },
      ],
    },
    {
      title: "Acquire Initial Clients and Build Credibility",
      description:
        "Establish your agency’s online presence, portfolio, and client acquisition strategies.",
      actions: [
        {
          label: "Build a website and portfolio",
          prompt:
            "What should I include on my agency’s website and in my marketing portfolio?",
        },
        {
          label: "Develop marketing strategies",
          prompt:
            "How do I market my own agency to attract clients?",
        },
        {
          label: "Leverage social proof",
          prompt:
            "How can I use testimonials and case studies to build credibility for my agency?",
        },
        {
          label: "Get first clients",
          prompt:
            "What are effective ways to acquire my first clients as a new agency?",
        },
      ],
    },
    {
      title: "Build a Team and Company Culture",
      description:
        "Recruit key roles, foster a positive culture, and invest in team development.",
      actions: [
        {
          label: "Identify key roles",
          prompt:
            "What roles and skills are essential for a marketing agency team?",
        },
        {
          label: "Recruit and retain talent",
          prompt:
            "How do I attract and retain top talent for my agency?",
        },
        {
          label: "Foster company culture",
          prompt:
            "What are best practices for building a positive and collaborative agency culture?",
        },
        {
          label: "Support employee growth",
          prompt:
            "How can I support ongoing training and development for my team?",
        },
      ],
    },
    {
      title: "Set Up Efficient Operations",
      description:
        "Implement workflows, tools, and documentation for smooth agency operations.",
      actions: [
        {
          label: "Establish workflows",
          prompt:
            "How do I create efficient workflows for client onboarding and project management?",
        },
        {
          label: "Choose software and tools",
          prompt:
            "What software and tools are essential for running a marketing agency?",
        },
        {
          label: "Document processes",
          prompt:
            "How do I document agency processes for consistency and scalability?",
        },
      ],
    },
    {
      title: "Navigate Challenges and Seize Opportunities",
      description:
        "Prepare for industry challenges and identify growth opportunities.",
      actions: [
        {
          label: "Overcome competition",
          prompt:
            "How can my agency stand out in a competitive market?",
        },
        {
          label: "Adapt to client expectations",
          prompt:
            "How do I manage rising client expectations and deliver measurable results?",
        },
        {
          label: "Leverage new technologies",
          prompt:
            "What new technologies should my agency adopt to stay competitive?",
        },
        {
          label: "Find growth opportunities",
          prompt:
            "What are emerging opportunities for marketing agencies in today’s market?",
        },
      ],
    },
    {
      title: "Scale and Grow Your Agency",
      description:
        "Develop strategies for sustainable growth, brand building, and client retention.",
      actions: [
        {
          label: "Build a strong brand",
          prompt:
            "How do I create a strong and recognizable brand for my agency?",
        },
        {
          label: "Productize services",
          prompt:
            "How can I productize my agency’s services for scalability?",
        },
        {
          label: "Invest in automation",
          prompt:
            "What automation tools can help my agency scale efficiently?",
        },
        {
          label: "Retain clients",
          prompt:
            "What strategies can I use to retain clients and encourage repeat business?",
        },
      ],
    },
  ],
};
