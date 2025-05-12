import { ScenarioData } from "../types";
import { MegaphoneIcon } from "@heroicons/react/24/outline";

const scenario: ScenarioData = {
  id: "self-assessment-and-planning",
  title: "Self-Assessment and Planning",
  description:
    "A step-by-step guide to launching a successful online business, from planning and branding to scaling and avoiding pitfalls.",
  icon: MegaphoneIcon,
  color: "#6B4CE6",
  steps: [
    {
      title: "Self-Assessment and Planning",
      description:
        "Evaluate your readiness, resources, and business idea before starting.",
      actions: [
        {
          label: "Assess my readiness",
          prompt:
            "What factors should I consider to determine if I’m ready to start an online business?",
        },
        {
          label: "Evaluate time and capital",
          prompt:
            "How do I assess the time and capital required for my online business idea?",
        },
        {
          label: "Align with my passion and skills",
          prompt:
            "How can I align my business idea with my personal interests and skills?",
        },
        {
          label: "Analyze market opportunity",
          prompt:
            "How do I evaluate if there’s a real market opportunity for my online business?",
        },
      ],
    },
    {
      title: "Identify and Validate Your Niche",
      description:
        "Find a profitable, low-competition, high-demand market segment.",
      actions: [
        {
          label: "Find a niche",
          prompt:
            "What are the best strategies to identify a profitable niche for my online business?",
        },
        {
          label: "Validate niche demand",
          prompt:
            "How do I validate that my chosen niche has enough demand and is not oversaturated?",
        },
        {
          label: "Analyze competitors",
          prompt:
            "How can I analyze competitors to find gaps and opportunities in my niche?",
        },
      ],
    },
    {
      title: "Define Your Product or Service",
      description:
        "Decide what you will offer and ensure it fits your market and skills.",
      actions: [
        {
          label: "Choose my offering",
          prompt:
            "How do I decide whether to sell physical products, digital products, or services online?",
        },
        {
          label: "Evaluate product-market fit",
          prompt:
            "How can I ensure my product or service fits the needs of my target market?",
        },
        {
          label: "Assess profitability",
          prompt:
            "What steps should I take to assess the profitability of my product or service idea?",
        },
      ],
    },
    {
      title: "Develop Your Unique Value Proposition",
      description:
        "Craft a clear statement that differentiates your business.",
      actions: [
        {
          label: "Create a UVP",
          prompt:
            "How do I create a unique value proposition that sets my business apart?",
        },
        {
          label: "Refine my USP",
          prompt:
            "What are the best ways to refine and communicate my unique selling proposition?",
        },
      ],
    },
    {
      title: "Build Your Brand Identity",
      description:
        "Establish a memorable and consistent brand across all channels.",
      actions: [
        {
          label: "Design my brand",
          prompt:
            "What are the key elements of a strong online brand identity?",
        },
        {
          label: "Create brand guidelines",
          prompt:
            "How do I create brand guidelines to ensure consistency across platforms?",
        },
        {
          label: "Develop brand voice",
          prompt:
            "How can I develop a unique and consistent brand voice for my business?",
        },
      ],
    },
    {
      title: "Set Up Your Online Presence",
      description: "Choose platforms, build your website, and prepare for sales.",
      actions: [
        {
          label: "Select e-commerce platform",
          prompt:
            "How do I choose the best e-commerce platform for my business needs?",
        },
        {
          label: "Build my website",
          prompt:
            "What are the steps to build a user-friendly and effective business website?",
        },
        {
          label: "Set up payment and shipping",
          prompt:
            "How do I set up secure payment gateways and efficient shipping options for my online store?",
        },
      ],
    },
    {
      title: "Drive Traffic and Acquire Customers",
      description:
        "Implement strategies to attract and convert visitors.",
      actions: [
        {
          label: "SEO strategy",
          prompt:
            "What advanced SEO strategies should I use to drive organic traffic in 2025?",
        },
        {
          label: "Content marketing plan",
          prompt:
            "How do I create a content marketing plan that attracts and engages my target audience?",
        },
        {
          label: "Social media tactics",
          prompt:
            "What are the most effective social media tactics for online business growth in 2025?",
        },
        {
          label: "Paid advertising tips",
          prompt:
            "How can I leverage AI-powered and unconventional paid advertising strategies for my online business?",
        },
      ],
    },
    {
      title: "Nurture Customer Relationships and Build Loyalty",
      description:
        "Foster long-term relationships and encourage repeat business.",
      actions: [
        {
          label: "Personalize customer experience",
          prompt:
            "How do I use data and AI to personalize the customer experience in my online business?",
        },
        {
          label: "Create loyalty programs",
          prompt:
            "What are the best practices for designing effective customer loyalty and referral programs?",
        },
        {
          label: "Engage and retain customers",
          prompt:
            "How can I engage and retain customers through multi-channel communication and community building?",
        },
      ],
    },
    {
      title: "Scale and Automate Operations",
      description:
        "Implement automation and outsourcing to grow efficiently.",
      actions: [
        {
          label: "Automate workflows",
          prompt:
            "What business processes should I automate to scale my online business efficiently?",
        },
        {
          label: "Outsource non-core tasks",
          prompt:
            "How do I identify and outsource non-core business functions for growth?",
        },
        {
          label: "Reinvest for growth",
          prompt:
            "What are the smartest ways to reinvest profits for sustainable online business growth?",
        },
      ],
    },
    {
      title: "Expand and Diversify",
      description:
        "Explore new markets, products, and business models.",
      actions: [
        {
          label: "Expand product offerings",
          prompt:
            "How do I identify and launch new products or services that align with my brand?",
        },
        {
          label: "Enter new markets",
          prompt:
            "What should I consider when expanding my online business into new markets or regions?",
        },
        {
          label: "Diversify revenue streams",
          prompt:
            "How can I diversify my revenue streams for long-term business stability?",
        },
      ],
    },
    {
      title: "Ensure Compliance and Manage Finances",
      description:
        "Stay legally compliant and manage your finances for sustainability.",
      actions: [
        {
          label: "Legal requirements",
          prompt:
            "What legal and regulatory requirements must I meet to operate my online business?",
        },
        {
          label: "Tax obligations",
          prompt:
            "How do I understand and manage tax obligations for my online business?",
        },
        {
          label: "Financial planning",
          prompt:
            "What are the key financial considerations and hidden costs I should plan for in my online business?",
        },
      ],
    },
    {
      title: "Avoid Common Pitfalls",
      description:
        "Learn from common mistakes and ensure long-term success.",
      actions: [
        {
          label: "Startup mistakes to avoid",
          prompt:
            "What are the most common mistakes new online businesses make and how can I avoid them?",
        },
        {
          label: "Validate product-market fit",
          prompt:
            "How do I validate product-market fit before scaling my online business?",
        },
        {
          label: "Prevent founder burnout",
          prompt:
            "What strategies can I use to prevent founder burnout and maintain work-life balance?",
        },
      ],
    },
  ],
};

export default scenario;