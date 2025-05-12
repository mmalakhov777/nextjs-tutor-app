import { ScenarioData } from "../types";
import { MegaphoneIcon } from "@heroicons/react/24/outline";

const scenario: ScenarioData = {
  id: "define-your-research-question-and-scope",
  title: "Define Your Research Question and Scope",
  description:
    "A step-by-step guide to planning, researching, analyzing, and writing a high-quality literature review.",
  icon: MegaphoneIcon,
  color: "#7C5CE0",
  steps: [
    {
      title: "Define Your Research Question and Scope",
      description:
        "Establish a clear, focused research question and determine the boundaries of your literature review.",
      actions: [
        {
          label: "Help me define my research question",
          prompt:
            "I need to write a literature review. How do I define a clear and focused research question?",
        },
        {
          label: "Set inclusion and exclusion criteria",
          prompt:
            "What criteria should I use to decide which sources to include or exclude from my literature review?",
        },
        {
          label: "Identify relevant keywords",
          prompt:
            "Can you help me generate keywords for searching literature on my research topic?",
        },
      ],
    },
    {
      title: "Identify and Gather Relevant Literature",
      description:
        "Strategically search for and collect scholarly sources using databases, search engines, and citation trails.",
      actions: [
        {
          label: "Find the best databases",
          prompt:
            "Which academic databases should I use to find literature for my topic?",
        },
        {
          label: "Use advanced search techniques",
          prompt:
            "What search strategies and Boolean operators can I use to improve my literature search results?",
        },
        {
          label: "Follow citation trails",
          prompt:
            "How do I use citation searching to find more relevant literature?",
        },
      ],
    },
    {
      title: "Critically Evaluate and Select Sources",
      description:
        "Assess the quality, relevance, and credibility of potential sources for your review.",
      actions: [
        {
          label: "Evaluate source credibility",
          prompt:
            "How do I assess the credibility and authority of a research source?",
        },
        {
          label: "Check for relevance and currency",
          prompt:
            "What factors should I consider to determine if a source is relevant and up-to-date for my literature review?",
        },
        {
          label: "Distinguish source types",
          prompt:
            "What is the difference between primary, secondary, and tertiary sources, and which should I prioritize?",
        },
      ],
    },
    {
      title: "Analyze and Identify Core Themes",
      description:
        "Engage deeply with your sources to extract key arguments, findings, and recurring themes.",
      actions: [
        {
          label: "Summarize key findings",
          prompt:
            "How do I effectively summarize the main findings and arguments from my sources?",
        },
        {
          label: "Identify core themes",
          prompt:
            "What techniques can I use to identify recurring themes and patterns in the literature?",
        },
        {
          label: "Compare and contrast studies",
          prompt:
            "How do I compare and contrast different studies to find similarities and differences?",
        },
      ],
    },
    {
      title: "Synthesize Information Across Sources",
      description:
        "Integrate findings from multiple sources to build a cohesive narrative and highlight relationships.",
      actions: [
        {
          label: "Use synthesis matrices",
          prompt:
            "How can I use a synthesis matrix to organize and connect information from different sources?",
        },
        {
          label: "Write thematic synthesis",
          prompt:
            "What are the best practices for synthesizing information around themes rather than individual sources?",
        },
        {
          label: "Highlight agreements and disagreements",
          prompt:
            "How do I present points of agreement and disagreement among sources in my literature review?",
        },
      ],
    },
    {
      title: "Structure and Organize the Review",
      description:
        "Choose an effective organizational framework and ensure logical flow and cohesion.",
      actions: [
        {
          label: "Select an organizational structure",
          prompt:
            "Should I organize my literature review chronologically, thematically, methodologically, or theoretically?",
        },
        {
          label: "Use transitions and headings",
          prompt:
            "How do I use transitions and headings to improve the flow and clarity of my literature review?",
        },
        {
          label: "Draft an effective introduction and conclusion",
          prompt:
            "What should I include in the introduction and conclusion of my literature review?",
        },
      ],
    },
    {
      title: "Identify and Present Non-Trivial Insights",
      description:
        "Spot gaps, contradictions, and debates in the literature and develop a novel perspective.",
      actions: [
        {
          label: "Find research gaps",
          prompt:
            "How do I identify gaps and areas for further research in the existing literature?",
        },
        {
          label: "Recognize debates and contradictions",
          prompt:
            "What should I look for to identify ongoing debates or contradictions in the literature?",
        },
        {
          label: "Develop a novel argument",
          prompt:
            "How can I move beyond summary to develop a unique perspective or argument in my literature review?",
        },
      ],
    },
    {
      title: "Avoid Common Pitfalls and Ensure Quality",
      description:
        "Ensure your review is substantive, well-referenced, and avoids common mistakes.",
      actions: [
        {
          label: "Avoid low-quality sources",
          prompt:
            "What types of sources should I avoid to maintain the quality of my literature review?",
        },
        {
          label: "Ensure critical analysis",
          prompt:
            "How do I make sure my literature review goes beyond description and includes critical analysis and synthesis?",
        },
        {
          label: "Prevent plagiarism and manage references",
          prompt:
            "What are best practices for citation management and avoiding plagiarism in my literature review?",
        },
      ],
    },
    {
      title: "Finalize and Refine the Literature Review",
      description:
        "Polish your review for clarity, coherence, and impact, ensuring it advances knowledge in the field.",
      actions: [
        {
          label: "Edit for clarity and flow",
          prompt:
            "What editing strategies can I use to improve the clarity and logical flow of my literature review?",
        },
        {
          label: "Check for substantive contribution",
          prompt:
            "How do I ensure my literature review makes a meaningful contribution to the field?",
        },
        {
          label: "Summarize key insights and implications",
          prompt:
            "How should I summarize the main findings and highlight the implications for future research in my conclusion?",
        },
      ],
    },
  ],
};

export default scenario;