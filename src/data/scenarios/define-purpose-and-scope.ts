import { MegaphoneIcon } from 'lucide-react';
import { ScenarioData } from '@/types/scenarios';

export const definePurposeAndScope: ScenarioData = {
  id: "define-purpose-and-scope",
  title: "Write a genealogy book",
  description:
    "Learn how to plan, research, write, and publish an engaging genealogy book, from defining its purpose to connecting with readers.",
  icon: MegaphoneIcon,
  color: "#6D4C41",
  steps: [
    {
      title: "Write a genealogy book",
      description:
        "Clarify the main goal and boundaries of your genealogy book to guide your research and writing.",
      actions: [
        {
          label: "Clarify my book's purpose",
          prompt: "How do I define the main purpose for my genealogy book?",
        },
        {
          label: "Set the scope of my genealogy book",
          prompt:
            "What are effective ways to determine the scope for a family history book?",
        },
        {
          label: "Choose a focus or theme",
          prompt:
            "Can you help me select a central theme or focus for my genealogy book?",
        },
      ],
    },
    {
      title: "Gather and Organize Research",
      description:
        "Collect genealogical data, stories, and documents, and organize them for easy access.",
      actions: [
        {
          label: "Find non-trivial family information",
          prompt:
            "What are the best sources for finding interesting stories and details about my ancestors?",
        },
        {
          label: "Organize my genealogy research",
          prompt:
            "How should I organize my genealogical data and documents for writing a book?",
        },
        {
          label: "Interview family members",
          prompt:
            "What questions should I ask relatives to gather meaningful family stories?",
        },
      ],
    },
    {
      title: "Structure the Book",
      description:
        "Choose an organizational format and outline chapters for maximum engagement.",
      actions: [
        {
          label: "Select a book structure",
          prompt:
            "What are the pros and cons of different ways to organize a genealogy book?",
        },
        {
          label: "Outline my chapters",
          prompt:
            "Can you help me create an outline for my genealogy book's chapters?",
        },
        {
          label: "Create engaging chapter openings",
          prompt:
            "How do I write compelling openings for each chapter in my family history book?",
        },
      ],
    },
    {
      title: "Write Engaging Narratives",
      description:
        "Transform facts into compelling stories using narrative techniques and descriptive writing.",
      actions: [
        {
          label: "Make my genealogy writing engaging",
          prompt:
            "What storytelling techniques can I use to make my genealogy book more interesting?",
        },
        {
          label: "Add emotion and relatability",
          prompt:
            "How do I highlight universal emotions and relatable stories in my family history?",
        },
        {
          label: "Incorporate dialogue and perspectives",
          prompt:
            "How can I use dialogue and multiple perspectives in my genealogy book?",
        },
      ],
    },
    {
      title: "Integrate Visual Elements",
      description:
        "Enhance your book with photos, documents, maps, and artifacts for depth and visual appeal.",
      actions: [
        {
          label: "Choose visuals for my book",
          prompt:
            "What types of visual elements should I include in my genealogy book?",
        },
        {
          label: "Organize and caption images",
          prompt:
            "How do I organize and write captions for photos and documents in my family history book?",
        },
        {
          label: "Improve image quality",
          prompt:
            "What are best practices for scanning and editing images for a printed genealogy book?",
        },
      ],
    },
    {
      title: "Cite Sources and Ensure Accuracy",
      description:
        "Document your sources and maintain credibility with proper citations.",
      actions: [
        {
          label: "Choose a citation style",
          prompt:
            "What citation styles are recommended for genealogy books?",
        },
        {
          label: "Cite sources as I write",
          prompt:
            "How do I efficiently cite sources while writing my genealogy book?",
        },
        {
          label: "Handle unverifiable stories",
          prompt:
            "How should I present family stories that can't be fully verified?",
        },
      ],
    },
    {
      title: "Polish and Supplement",
      description:
        "Add appendices, create an index, and edit your manuscript for clarity and professionalism.",
      actions: [
        {
          label: "Add appendices and extras",
          prompt:
            "What supplementary materials should I include in the appendices of my genealogy book?",
        },
        {
          label: "Create an index",
          prompt:
            "How do I make a useful index for names and places in my family history book?",
        },
        {
          label: "Edit and proofread",
          prompt:
            "What are the best ways to edit and proofread my genealogy book before publishing?",
        },
      ],
    },
    {
      title: "Design, Format, and Publish",
      description:
        "Finalize the layout, choose publishing options, and prepare your book for distribution.",
      actions: [
        {
          label: "Design my book layout",
          prompt:
            "What are best practices for designing the layout of a genealogy book?",
        },
        {
          label: "Choose a publishing method",
          prompt:
            "What are the pros and cons of self-publishing versus professional publishing for a genealogy book?",
        },
        {
          label: "Prepare for print and digital formats",
          prompt:
            "How do I format my genealogy book for both print and digital distribution?",
        },
      ],
    },
    {
      title: "Engage and Connect with Readers",
      description:
        "Keep your audience interested with focused writing, relatable stories, and visual variety.",
      actions: [
        {
          label: "Keep my writing concise",
          prompt:
            "How do I keep my genealogy book focused and avoid overwhelming readers with too much detail?",
        },
        {
          label: "Make stories relatable",
          prompt:
            "What techniques help make family history stories relatable to modern readers?",
        },
        {
          label: "Enhance visual appeal",
          prompt:
            "How can I use visuals and design to make my genealogy book more engaging?",
        },
      ],
    },
  ],
};