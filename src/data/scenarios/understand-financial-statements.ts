import { ScenarioData } from '@/types/scenarios';
import { MegaphoneIcon } from 'lucide-react';

export const understandFinancialStatements: ScenarioData = {
  id: "understand-financial-statements",
  title: "Understand Financial Statements",
  description:
    "Learn to analyze, interpret, and apply financial statements for business insights and decision-making.",
  icon: MegaphoneIcon,
  color: "#7C4DFF",
  steps: [
    {
      title: "Understand Financial Statements",
      description:
        "Learn the purpose and structure of balance sheets and profit and loss accounts.",
      actions: [
        {
          label: "Explain the role of financial statements",
          prompt:
            "What is the purpose of balance sheets and profit and loss accounts in business?",
        },
        {
          label: "Identify key users of financial statements",
          prompt:
            "Who uses financial statements and why are they important to different stakeholders?",
        },
        {
          label: "Overview of statement types",
          prompt:
            "What are the main types of financial statements and how do they relate to each other?",
        },
      ],
    },
    {
      title: "Analyze the Balance Sheet",
      description:
        "Break down the components and principles of the balance sheet.",
      actions: [
        {
          label: "Explain the accounting equation",
          prompt:
            "What is the accounting equation and why must the balance sheet always balance?",
        },
        {
          label: "List and define asset types",
          prompt:
            "What are current and non-current assets, and what are some examples of each?",
        },
        {
          label: "List and define liability types",
          prompt:
            "What are current and non-current liabilities, and what are some examples of each?",
        },
        {
          label: "Describe equity components",
          prompt:
            "What is equity on the balance sheet and what are its main components?",
        },
      ],
    },
    {
      title: "Analyze the Profit and Loss Account",
      description:
        "Understand the structure and key metrics of the profit and loss account.",
      actions: [
        {
          label: "Explain revenue and expense recognition",
          prompt:
            "How are revenues and expenses recognized on the profit and loss account?",
        },
        {
          label: "Describe key profitability metrics",
          prompt:
            "What are gross profit, operating profit, net profit, and EBITDA, and how are they calculated?",
        },
        {
          label: "Discuss accounting methods",
          prompt:
            "What is the difference between accrual and cash accounting methods?",
        },
      ],
    },
    {
      title: "Connect the Balance Sheet and P&L",
      description:
        "Explore how the balance sheet and profit and loss account are linked.",
      actions: [
        {
          label: "Explain retained earnings",
          prompt:
            "How does net income from the profit and loss account affect retained earnings on the balance sheet?",
        },
        {
          label: "Show statement articulation",
          prompt:
            "How do transactions flow between the profit and loss account and the balance sheet?",
        },
        {
          label: "Describe the role of cash flow",
          prompt:
            "How does the statement of cash flows connect to the balance sheet and profit and loss account?",
        },
      ],
    },
    {
      title: "Apply Analytical Techniques",
      description:
        "Use advanced methods to extract insights from financial statements.",
      actions: [
        {
          label: "Perform ratio analysis",
          prompt:
            "What are key financial ratios for analyzing liquidity, solvency, and profitability?",
        },
        {
          label: "Conduct trend analysis",
          prompt:
            "How do you use trend analysis to evaluate financial performance over time?",
        },
        {
          label: "Do comparative analysis",
          prompt:
            "How can you compare financial statements across periods or with competitors?",
        },
      ],
    },
    {
      title: "Avoid Common Mistakes",
      description:
        "Recognize and prevent frequent errors in financial statement preparation and analysis.",
      actions: [
        {
          label: "List common balance sheet errors",
          prompt:
            "What are common mistakes made when preparing a balance sheet?",
        },
        {
          label: "List common P&L errors",
          prompt:
            "What are common mistakes made when preparing a profit and loss account?",
        },
        {
          label: "Discuss industry-specific challenges",
          prompt:
            "What are some unique accounting challenges faced by different industries?",
        },
      ],
    },
    {
      title: "Interpret and Use Insights",
      description:
        "Leverage financial statement analysis for decision-making and strategic planning.",
      actions: [
        {
          label: "Assess financial health",
          prompt:
            "How do you interpret financial statements to assess a company's financial health?",
        },
        {
          label: "Support business valuation",
          prompt:
            "How are financial statements used in business valuation and what should be considered?",
        },
        {
          label: "Guide strategic decisions",
          prompt:
            "How can insights from financial statements inform business strategy and risk management?",
        },
      ],
    },
  ],
};
