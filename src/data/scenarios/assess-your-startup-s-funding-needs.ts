import { MegaphoneIcon } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const assessYourStartupSFundingNeeds: ScenarioData = {
  id: "assess-your-startup-s-funding-needs",
  title: "Assess Your Startup's Funding Needs",
  description:
    "A step-by-step guide to planning, preparing, and succeeding with startup funding: from estimating needs and researching sources to pitching and avoiding common pitfalls.",
  icon: MegaphoneIcon,
  color: "#8C6EFF",
  steps: [
    {
      title: "Assess Your Startup's Funding Needs",
      description:
        "Evaluate your business model, growth stage, and capital requirements to determine how much funding you need and for what purpose.",
      actions: [
        {
          label: "Estimate funding requirements",
          prompt:
            "How do I calculate how much funding my startup needs for the next 12-24 months?",
        },
        {
          label: "Identify funding use cases",
          prompt:
            "What are the typical uses of startup funding and how should I allocate my budget?",
        },
        {
          label: "Analyze financial runway",
          prompt:
            "How do I determine my startup's financial runway and when I'll need to raise more capital?",
        },
      ],
    },
    {
      title: "Research and Select Funding Sources",
      description:
        "Explore and compare different funding avenues such as government grants, loans, equity financing, crowdfunding, and bootstrapping.",
      actions: [
        {
          label: "Compare funding options",
          prompt:
            "What are the pros and cons of government grants, venture capital, angel investors, crowdfunding, and loans for startups?",
        },
        {
          label: "Find relevant government programs",
          prompt:
            "Which government grants or loan programs are available for startups in my industry and location?",
        },
        {
          label: "Evaluate equity vs. debt",
          prompt:
            "Should my startup pursue equity financing or debt financing at this stage?",
        },
      ],
    },
    {
      title: "Prepare a Compelling Business Plan",
      description:
        "Develop a detailed business plan that clearly communicates your vision, market opportunity, financial projections, and funding needs.",
      actions: [
        {
          label: "Business plan essentials",
          prompt:
            "What are the key components of a business plan that investors and lenders look for?",
        },
        {
          label: "Create financial projections",
          prompt:
            "How do I create realistic financial projections for my startup?",
        },
        {
          label: "Tailor plan for funders",
          prompt:
            "How should I adapt my business plan for different types of funders (VCs, banks, grant agencies)?",
        },
      ],
    },
    {
      title: "Determine and Justify Your Startup Valuation",
      description:
        "Understand and apply appropriate valuation methods to set a fair and credible value for your startup.",
      actions: [
        {
          label: "Choose valuation method",
          prompt:
            "What are the most common methods for valuing an early-stage startup?",
        },
        {
          label: "Factors influencing valuation",
          prompt:
            "What factors will most impact my startup's valuation in the eyes of investors?",
        },
        {
          label: "Prepare for valuation negotiation",
          prompt:
            "How can I justify my startup's valuation when negotiating with investors?",
        },
      ],
    },
    {
      title: "Engage with Potential Funders",
      description:
        "Identify, approach, and pitch to the right investors, lenders, or grant agencies for your startup.",
      actions: [
        {
          label: "Find and research investors",
          prompt:
            "How do I find and research investors or funding partners that are a good fit for my startup?",
        },
        {
          label: "Craft a compelling pitch",
          prompt:
            "What are the key elements of a successful pitch to investors or lenders?",
        },
        {
          label: "Leverage incubators and accelerators",
          prompt:
            "How can I use incubators or accelerators to access funding and mentorship?",
        },
      ],
    },
    {
      title: "Navigate Legal and Regulatory Requirements",
      description:
        "Ensure your startup is legally prepared for funding, with clear ownership, IP protection, and compliance.",
      actions: [
        {
          label: "Legal documents checklist",
          prompt:
            "What legal documents and agreements do I need in place before raising funds?",
        },
        {
          label: "Protect intellectual property",
          prompt:
            "How do I protect my startup's intellectual property before seeking funding?",
        },
        {
          label: "Understand securities regulations",
          prompt:
            "What legal and regulatory issues should I be aware of when raising capital, especially through crowdfunding or equity rounds?",
        },
      ],
    },
    {
      title: "Avoid Common Funding Pitfalls",
      description:
        "Learn about and proactively address common mistakes that hinder startup fundraising success.",
      actions: [
        {
          label: "Identify common mistakes",
          prompt:
            "What are the most common mistakes startups make when seeking funding and how can I avoid them?",
        },
        {
          label: "Plan for equity dilution",
          prompt:
            "How can I manage and plan for equity dilution when raising multiple funding rounds?",
        },
        {
          label: "Time your fundraising",
          prompt:
            "How do I know when is the right time to start seeking funding for my startup?",
        },
      ],
    },
    {
      title: "Leverage Success Stories and Case Studies",
      description:
        "Draw inspiration and practical lessons from real-world examples of successful startup funding strategies.",
      actions: [
        {
          label: "Study funding case studies",
          prompt:
            "Can you share case studies of startups that used innovative or diverse funding strategies?",
        },
        {
          label: "Learn from bootstrapped startups",
          prompt:
            "What can I learn from startups that succeeded through bootstrapping or non-traditional funding?",
        },
        {
          label: "Analyze recent funding trends",
          prompt:
            "What are the latest trends in startup funding, especially in high-growth sectors like AI and cybersecurity?",
        },
      ],
    },
  ],
};