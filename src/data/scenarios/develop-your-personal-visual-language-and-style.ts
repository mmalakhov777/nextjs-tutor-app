import { ScenarioData } from "../types";
import { MegaphoneIcon } from "@heroicons/react/24/outline";

const scenario: ScenarioData = {
  id: "develop-your-personal-visual-language-and-style",
  title: "Develop Your Personal Visual Language and Style",
  description:
    "Learn how to cultivate a unique tattoo style, seek mentorship, leverage social media, define your niche, and build credibility as an aspiring tattoo artist.",
  icon: MegaphoneIcon,
  color: "#8861e0",
  steps: [
    {
      title: "Develop Your Personal Visual Language and Style",
      description:
        "Cultivate a unique artistic identity that sets your tattoo work apart.",
      actions: [
        {
          label: "Find my recurring artistic themes",
          prompt:
            "How can I analyze my sketches to identify recurring motifs or techniques that could define my tattoo style?",
        },
        {
          label: "Experiment with new art mediums",
          prompt:
            "Suggest ways I can experiment with different art forms (like painting, calligraphy, or sculpture) to inspire my tattoo designs.",
        },
        {
          label: "Visualize designs on the body",
          prompt:
            "How do I practice translating my art to tattoo designs that fit and flow with the human body?",
        },
      ],
    },
    {
      title: "Seek Mentorship in Unexpected Places",
      description:
        "Find guidance and learn from experienced artists and other creatives, even outside traditional apprenticeships.",
      actions: [
        {
          label: "Learn as a tattoo client",
          prompt:
            "What should I observe and ask when getting tattooed by a professional to learn about their process?",
        },
        {
          label: "Connect with online mentors",
          prompt:
            "How can I use online communities and social media to find mentorship and get feedback on my tattoo art?",
        },
        {
          label: "Cross-train with other artists",
          prompt:
            "What types of non-tattoo art mentors or classes could help me improve my tattoo skills?",
        },
      ],
    },
    {
      title: "Leverage Social Media in Unconventional Ways",
      description:
        "Use social platforms creatively to build your brand, network, and credibility before you’re licensed.",
      actions: [
        {
          label: "Document my artistic journey",
          prompt:
            "What are some engaging ways to share my progress and learning process as an aspiring tattoo artist on social media?",
        },
        {
          label: "Build a distinctive online brand",
          prompt:
            "How do I create a consistent and memorable online presence as a beginner tattoo artist?",
        },
        {
          label: "Engage with the tattoo community",
          prompt:
            "What are creative ways to network and get noticed by other artists and potential clients online?",
        },
      ],
    },
    {
      title: "Differentiate Yourself Early with a Signature Niche",
      description:
        "Stand out by specializing in a style or theme that reflects your passion and strengths.",
      actions: [
        {
          label: "Identify my tattoo niche",
          prompt:
            "How can I discover and define a tattoo niche or specialty that fits my interests and skills?",
        },
        {
          label: "Build a focused portfolio",
          prompt:
            "What’s the best way to create a small but strong portfolio that showcases my chosen tattoo style?",
        },
        {
          label: "Tell my artistic story",
          prompt:
            "How do I craft a personal brand story that connects my background and interests to my tattoo niche?",
        },
      ],
    },
    {
      title: "Build Credibility Before You’re Licensed",
      description:
        "Establish a reputation for professionalism, safety, and reliability from the very beginning.",
      actions: [
        {
          label: "Master tattoo hygiene and safety",
          prompt:
            "What steps can I take to learn and demonstrate proper tattoo hygiene and safety practices as a beginner?",
        },
        {
          label: "Practice professionalism with every project",
          prompt:
            "How do I treat my practice tattoos and art commissions with the same professionalism as real client work?",
        },
        {
          label: "Get involved in the tattoo community",
          prompt:
            "What are some ways I can start building a positive reputation in the tattoo community before I’m officially licensed?",
        },
      ],
    },
  ],
};

export default scenario;