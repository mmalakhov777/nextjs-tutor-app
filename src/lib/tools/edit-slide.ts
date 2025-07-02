import { z } from 'zod';

export const editSlideTool = {
  name: 'editSlide',
  description: 'Create or edit a presentation slide by slide number. Use this to build presentations slide by slide with modern, professional styling. Default font sizes: Heading (h1): 2.2em, Subtitle (p): 1.1em, Bullet points (ul): 1em unless user specifies different sizes.',
  parameters: z.object({
    slideNumber: z.number().describe('The slide number (1, 2, 3, etc.) to create or edit'),
    title: z.string().describe('The slide title - displayed prominently at the top in large, bold text'),
    content: z.string().describe('The slide content in HTML format with modern, clean, minimalist design. Use div, h1-h6, p, ul, li, strong, em tags with inline styles. Include proper spacing, hierarchy, and professional sans-serif fonts. Ensure text is clearly readable with appropriate contrast. Add beautiful illustrations including people (professionals, teams, diverse individuals), cityscapes, nature scenes (mountains, forests, oceans), technology imagery, or any other relevant illustrations that complement the slide content. These illustrations should enhance visual appeal and support the message. Make it look like a high-quality PowerPoint or Keynote slide with stunning visual design. CRITICAL FOR CHARTS: When user asks to create charts or graphs, the content must ONLY contain a single canvas element like: <canvas id="chartId"></canvas> - NO headings, NO text, NO other HTML elements. The title parameter handles the heading automatically.'),
    backgroundColor: z.string().optional().describe('Background color for the slide (hex color like #2c3e50). Will be used to determine appropriate text color contrast.'),
    transition: z.enum(['slide', 'fade', 'zoom', 'convex', 'concave']).optional().describe('Slide transition animation'),
    style: z.enum(['modern', 'classic']).optional().describe('Slide design style - modern for clean minimalist design, classic for traditional PowerPoint style')
  }),
  execute: async ({ 
    slideNumber, 
    title, 
    content, 
    backgroundColor = '#2c3e50', 
    transition = 'slide',
    style = 'modern'
  }: { 
    slideNumber: number; 
    title: string; 
    content: string; 
    backgroundColor?: string; 
    transition?: 'slide' | 'fade' | 'zoom' | 'convex' | 'concave';
    style?: 'modern' | 'classic';
  }) => {
    console.log('🎭 EditSlide tool execute called with:', {
      slideNumber,
      title: title.substring(0, 50) + '...',
      backgroundColor,
      transition,
      style,
      contentLength: content.length
    });

    // Validate slide number
    if (slideNumber < 1) {
      throw new Error('Slide number must be 1 or greater');
    }

    // Validate background color format
    if (backgroundColor && !backgroundColor.match(/^#[0-9A-Fa-f]{6}$/)) {
      console.warn('Invalid background color format, using default');
      backgroundColor = '#2c3e50';
    }

    // Determine text color based on background (same logic as route.ts)
    const getTextColor = (bgColor: string) => {
      // Convert hex to RGB
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // Calculate relative luminance
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Return white for dark backgrounds, dark for light backgrounds
      return luminance > 0.5 ? '#333333' : '#ffffff';
    };

    const textColor = getTextColor(backgroundColor);

    // Convert content to plain text for image prompt
    const plainContent = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&bull;/g, '•')
      .replace(/\n\n+/g, '\n')
      .trim();

    // Create detailed aesthetic prompt for image generation
    const imagePrompt = `Create a breathtakingly beautiful and sophisticated presentation slide with exceptional visual appeal:

    TITLE & CONTENT:
    - Title: "${title.trim()}" - displayed as a stunning, bold centerpiece with elegant typography
    - Content: ${plainContent}
    
    VISUAL DESIGN EXCELLENCE:
    - Background: Rich ${backgroundColor} with subtle gradients, textures, or artistic overlays
    - Style: ${style === 'modern' ? 'Ultra-modern, sophisticated minimalism with premium aesthetics' : 'Timeless elegance with refined classic design elements'}
    - Typography: Premium ${textColor} text using elegant sans-serif fonts (Segoe UI, Helvetica, Avenir)
    - Layout: Masterfully balanced composition with perfect spacing, visual rhythm, and hierarchy
    
    STUNNING VISUAL ELEMENTS:
    - Add appropriate photorealistic illustrations that match the scene and meaning of the content.
    - Add sophisticated design elements: subtle geometric patterns, elegant lines, refined shadows, premium gradients
    - Include artistic touches: soft lighting effects, depth layers, premium textures, sophisticated color harmonies
    - CHARTS & GRAPHS: If content includes data, statistics, or numerical information, create super beautiful aesthetic charts and graphs with:
      * Modern, clean design with elegant color schemes
      * Professional data visualization with stunning visual appeal
      * Beautiful gradients, subtle shadows, and premium styling
      * Clear, readable labels with sophisticated typography
      * Artistic elements that enhance rather than distract from the data
      * Use vibrant yet professional color palettes that complement the slide background
      * Make charts visually striking and magazine-quality beautiful
    
    PREMIUM QUALITY STANDARDS:
    - Ultra-high visual impact with magazine-quality aesthetics
    - Perfect contrast and readability with artistic flair
    - Luxurious, polished appearance worthy of Fortune 500 presentations
    - Seamless blend of professionalism and artistic beauty
    - 16:9 aspect ratio optimized for maximum visual impact
    
    Create a slide that viewers will find absolutely stunning and memorable - a perfect fusion of information and artistic excellence.`;

    // Create the slide object with image prompt
    const slide = {
      id: slideNumber.toString(),
      title: title.trim(),
      backgroundColor,
      textColor,
      transition,
      style,
      imagePrompt, // The main prompt for image generation
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('✅ EditSlide tool completed successfully:', {
      slideNumber,
      title: slide.title,
      backgroundColor: slide.backgroundColor,
      textColor: slide.textColor,
      transition: slide.transition,
      style: slide.style
    });

    // Return the slide data that the component can use
    return {
      success: true,
      slideNumber,
      slide,
      message: `Slide ${slideNumber} "${title}" has been ${slideNumber <= 5 ? 'created' : 'updated'} successfully with ${style} styling.`
    };
  },
}; 