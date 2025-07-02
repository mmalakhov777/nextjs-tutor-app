import { z } from 'zod';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const cvWriterTool = {
  name: 'writeCv',
  description: 'Generate a professional CV/Resume with ATS optimization and structured formatting',
  parameters: z.object({
    personalInfo: z.object({
      fullName: z.string().describe('Full name of the candidate'),
      email: z.string().describe('Email address'),
      phone: z.string().describe('Phone number'),
      location: z.string().describe('City, State/Country'),
      linkedIn: z.string().optional().describe('LinkedIn profile URL'),
      website: z.string().optional().describe('Personal website or portfolio URL'),
    }).describe('Personal contact information'),
    
    targetRole: z.string().describe('Target job title or role'),
    industry: z.string().describe('Target industry or field'),
    careerLevel: z.enum(['entry-level', 'mid-career', 'senior', 'executive']).describe('Career level'),
    
    professionalSummary: z.string().describe('Brief professional summary or career objective'),
    
    workExperience: z.array(z.object({
      jobTitle: z.string().describe('Job title'),
      company: z.string().describe('Company name'),
      location: z.string().describe('Job location'),
      startDate: z.string().describe('Start date (e.g., "Jan 2020")'),
      endDate: z.string().describe('End date (e.g., "Dec 2022" or "Present")'),
      achievements: z.array(z.string()).describe('Key achievements and responsibilities'),
    })).describe('Work experience history'),
    
    education: z.array(z.object({
      degree: z.string().describe('Degree title'),
      institution: z.string().describe('School/University name'),
      location: z.string().describe('Institution location'),
      graduationDate: z.string().describe('Graduation date or expected date'),
      gpa: z.string().optional().describe('GPA if relevant'),
      honors: z.string().optional().describe('Honors, awards, or distinctions'),
    })).describe('Education background'),
    
    skills: z.object({
      technical: z.array(z.string()).optional().describe('Technical skills'),
      soft: z.array(z.string()).optional().describe('Soft skills'),
      languages: z.array(z.string()).optional().describe('Language proficiencies'),
      certifications: z.array(z.string()).optional().describe('Professional certifications'),
    }).describe('Skills and competencies'),
    
    additionalSections: z.object({
      projects: z.array(z.object({
        name: z.string(),
        description: z.string(),
        technologies: z.array(z.string()).optional(),
        url: z.string().optional(),
      })).optional().describe('Notable projects'),
      
      publications: z.array(z.object({
        title: z.string(),
        publication: z.string(),
        date: z.string(),
        url: z.string().optional(),
      })).optional().describe('Publications or articles'),
      
      awards: z.array(z.object({
        title: z.string(),
        organization: z.string(),
        date: z.string(),
        description: z.string().optional(),
      })).optional().describe('Awards and recognitions'),
      
      volunteerWork: z.array(z.object({
        role: z.string(),
        organization: z.string(),
        date: z.string(),
        description: z.string(),
      })).optional().describe('Volunteer experience'),
    }).optional().describe('Additional sections'),
    
    cvFormat: z.enum(['modern', 'traditional', 'creative', 'ats-optimized']).default('ats-optimized').describe('CV format style'),
    includeKeywords: z.array(z.string()).optional().describe('Industry-specific keywords to include'),
    customRequirements: z.string().optional().describe('Any specific requirements or preferences'),
  }),
  
  execute: async (params: {
    personalInfo: {
      fullName: string;
      email: string;
      phone: string;
      location: string;
      linkedIn?: string;
      website?: string;
    };
    targetRole: string;
    industry: string;
    careerLevel: 'entry-level' | 'mid-career' | 'senior' | 'executive';
    professionalSummary: string;
    workExperience: Array<{
      jobTitle: string;
      company: string;
      location: string;
      startDate: string;
      endDate: string;
      achievements: string[];
    }>;
    education: Array<{
      degree: string;
      institution: string;
      location: string;
      graduationDate: string;
      gpa?: string;
      honors?: string;
    }>;
    skills: {
      technical?: string[];
      soft?: string[];
      languages?: string[];
      certifications?: string[];
    };
    additionalSections?: {
      projects?: Array<{
        name: string;
        description: string;
        technologies?: string[];
        url?: string;
      }>;
      publications?: Array<{
        title: string;
        publication: string;
        date: string;
        url?: string;
      }>;
      awards?: Array<{
        title: string;
        organization: string;
        date: string;
        description?: string;
      }>;
      volunteerWork?: Array<{
        role: string;
        organization: string;
        date: string;
        description: string;
      }>;
    };
    cvFormat: 'modern' | 'traditional' | 'creative' | 'ats-optimized';
    includeKeywords?: string[];
    customRequirements?: string;
  }) => {
    console.log('🎯 CV Writer tool execute called for:', {
      targetRole: params.targetRole,
      industry: params.industry,
      careerLevel: params.careerLevel,
      format: params.cvFormat,
      hasKeywords: !!params.includeKeywords?.length,
      keywordCount: params.includeKeywords?.length || 0
    });

    // Build comprehensive system prompt for CV generation
    const systemPrompt = `You are a professional CV/Resume writer with expertise in creating ATS-optimized, industry-specific resumes that help candidates land interviews. You understand modern hiring practices, ATS systems, and what recruiters look for.

CRITICAL OUTPUT FORMAT:
You MUST return a JSON object with the following structure:
{
  "html": "HTML content of the CV",
  "title": "CV title (e.g., 'John Doe - Software Engineer CV')"
}

CORE PRINCIPLES:
- Create ATS-friendly formatting that passes automated screening
- Use industry-relevant keywords naturally throughout the content
- Quantify achievements with specific metrics and numbers
- Use strong action verbs and impactful language
- Tailor content to the specific role and industry
- Ensure professional formatting and clean structure
- Focus on results and impact, not just responsibilities

HTML STRUCTURE GUIDELINES:
- Use semantic HTML tags (header, main, section, article, etc.)
- Include proper heading hierarchy (h1 for name, h2 for sections, h3 for subsections)
- Use lists (ul, ol) for achievements and skills
- Include contact information in a header section
- Structure sections logically (Contact, Summary, Experience, Education, Skills, etc.)
- Use classes for styling hooks but keep HTML clean and semantic
- DO NOT include any inline styles or CSS - styling will be handled separately
- Focus on semantic structure and content organization

ATS OPTIMIZATION:
- Include relevant keywords from the target industry/role
- Use standard section headings (Professional Summary, Experience, Education, Skills)
- Avoid complex formatting that ATS can't parse
- Include both acronyms and full terms (e.g., "AI (Artificial Intelligence)")
- Use consistent date formats
- Structure content in logical, scannable sections

CONTENT STRATEGY:
- Start with a compelling professional summary
- Highlight most relevant experience first
- Use the STAR method for achievement descriptions (Situation, Task, Action, Result)
- Include quantifiable results wherever possible
- Tailor skills section to job requirements
- Show career progression and growth

INDUSTRY-SPECIFIC CONSIDERATIONS:
- Technology: Emphasize technical skills, projects, and certifications
- Healthcare: Focus on patient outcomes, compliance, and certifications
- Finance: Highlight analytical skills, risk management, and regulatory knowledge
- Marketing: Showcase campaign results, ROI, and creative achievements
- Sales: Emphasize revenue generation, client relationships, and targets exceeded
- Education: Focus on student outcomes, curriculum development, and teaching methods

Generate a complete, professional CV with structured HTML that is both ATS-friendly and well-organized for styling.`;

    // Build detailed user prompt with all CV information
    const userPrompt = `Create a professional ${params.cvFormat} CV/Resume for the following candidate:

PERSONAL INFORMATION:
- Name: ${params.personalInfo.fullName}
- Email: ${params.personalInfo.email}
- Phone: ${params.personalInfo.phone}
- Location: ${params.personalInfo.location}
${params.personalInfo.linkedIn ? `- LinkedIn: ${params.personalInfo.linkedIn}` : ''}
${params.personalInfo.website ? `- Website: ${params.personalInfo.website}` : ''}

TARGET ROLE: ${params.targetRole}
INDUSTRY: ${params.industry}
CAREER LEVEL: ${params.careerLevel}

PROFESSIONAL SUMMARY:
${params.professionalSummary}

WORK EXPERIENCE:
${params.workExperience.map((exp, index) => `
${index + 1}. ${exp.jobTitle} at ${exp.company}
   Location: ${exp.location}
   Duration: ${exp.startDate} - ${exp.endDate}
   Key Achievements:
   ${exp.achievements.map(achievement => `   • ${achievement}`).join('\n')}
`).join('\n')}

EDUCATION:
${params.education.map((edu, index) => `
${index + 1}. ${edu.degree}
   Institution: ${edu.institution}, ${edu.location}
   Graduation: ${edu.graduationDate}
   ${edu.gpa ? `GPA: ${edu.gpa}` : ''}
   ${edu.honors ? `Honors: ${edu.honors}` : ''}
`).join('\n')}

SKILLS:
${params.skills.technical?.length ? `Technical Skills: ${params.skills.technical.join(', ')}` : ''}
${params.skills.soft?.length ? `Soft Skills: ${params.skills.soft.join(', ')}` : ''}
${params.skills.languages?.length ? `Languages: ${params.skills.languages.join(', ')}` : ''}
${params.skills.certifications?.length ? `Certifications: ${params.skills.certifications.join(', ')}` : ''}

${params.additionalSections?.projects?.length ? `
PROJECTS:
${params.additionalSections.projects.map((project, index) => `
${index + 1}. ${project.name}
   Description: ${project.description}
   ${project.technologies?.length ? `Technologies: ${project.technologies.join(', ')}` : ''}
   ${project.url ? `URL: ${project.url}` : ''}
`).join('\n')}` : ''}

${params.additionalSections?.publications?.length ? `
PUBLICATIONS:
${params.additionalSections.publications.map((pub, index) => `
${index + 1}. "${pub.title}"
   Published in: ${pub.publication} (${pub.date})
   ${pub.url ? `URL: ${pub.url}` : ''}
`).join('\n')}` : ''}

${params.additionalSections?.awards?.length ? `
AWARDS & RECOGNITION:
${params.additionalSections.awards.map((award, index) => `
${index + 1}. ${award.title}
   Organization: ${award.organization} (${award.date})
   ${award.description ? `Description: ${award.description}` : ''}
`).join('\n')}` : ''}

${params.additionalSections?.volunteerWork?.length ? `
VOLUNTEER EXPERIENCE:
${params.additionalSections.volunteerWork.map((vol, index) => `
${index + 1}. ${vol.role} at ${vol.organization}
   Date: ${vol.date}
   Description: ${vol.description}
`).join('\n')}` : ''}

${params.includeKeywords?.length ? `
IMPORTANT KEYWORDS TO INCLUDE: ${params.includeKeywords.join(', ')}
Please naturally incorporate these keywords throughout the CV where relevant.` : ''}

${params.customRequirements ? `
CUSTOM REQUIREMENTS: ${params.customRequirements}` : ''}

INSTRUCTIONS:
1. Create a complete, professional CV with structured HTML
2. Return the result as a JSON object with "html" and "title" fields
3. Optimize for ATS systems while maintaining visual appeal
4. Use strong action verbs and quantify achievements where possible
5. Include relevant industry keywords naturally
6. Ensure proper semantic HTML structure
7. Focus on results and impact rather than just duties
8. Tailor the content to the ${params.targetRole} role in ${params.industry}
9. Make it appropriate for ${params.careerLevel} level position

RETURN FORMAT: JSON object with html and title fields.`;

    console.log('🚀 Calling OpenAI to generate structured CV');

    // Generate the CV using GPT-4
    const result = await generateText({
      model: openai('gpt-4.1'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent, professional output
      maxTokens: 15000,
    });
    
    console.log('✅ CV Writer tool completed successfully:', {
      contentLength: result.text.length,
      targetRole: params.targetRole,
      industry: params.industry
    });

    // Parse the JSON response and return structured CV content
    try {
      const cvData = JSON.parse(result.text);
      
      // Validate that we have the required fields
      if (!cvData.html) {
        throw new Error('Missing HTML content in CV response');
      }
      
      // Return structured CV content with timestamps
      return {
        html: cvData.html,
        title: cvData.title || `${params.personalInfo.fullName} - ${params.targetRole} CV`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (parseError) {
      console.error('Failed to parse CV JSON response:', parseError);
      console.log('Raw response:', result.text);
      
      // Fallback: treat the entire response as HTML
      return {
        html: result.text,
        title: `${params.personalInfo.fullName} - ${params.targetRole} CV`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  },
}; 