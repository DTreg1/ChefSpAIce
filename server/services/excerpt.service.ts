/**
 * Excerpt Generation Service
 * 
 * Creates compelling preview snippets for content using OpenAI GPT-3.5-turbo,
 * optimized for social media sharing and preview cards with A/B testing support.
 * 
 * Features:
 * - Multiple excerpt variants for A/B testing
 * - Platform-specific optimization (Twitter, LinkedIn, Facebook)
 * - Character limit enforcement
 * - Engagement optimization with CTR tracking
 * - Social metadata generation
 * 
 * @module server/services/excerpt
 */

import OpenAI from 'openai';

interface ExcerptGenerationOptions {
  content: string;
  targetPlatform?: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'generic';
  excerptType?: 'social' | 'email' | 'card' | 'meta' | 'summary';
  tone?: 'professional' | 'casual' | 'formal' | 'friendly' | 'exciting' | 'informative';
  style?: 'descriptive' | 'action-oriented' | 'question-based' | 'teaser' | 'summary';
  targetAudience?: string;
  callToAction?: boolean;
  hashtags?: boolean;
  emojis?: boolean;
  maxCharacters?: number;
  temperature?: number;
  variantCount?: number; // Number of variants to generate
}

interface GeneratedExcerpt {
  text: string;
  characterCount: number;
  wordCount: number;
  variant: string;
  metadata?: {
    title?: string;
    description?: string;
    imageUrl?: string;
    twitterCard?: 'summary' | 'summary_large_image';
    ogType?: string;
  };
  generationParams: {
    tone?: string;
    style?: string;
    targetAudience?: string;
    callToAction?: boolean;
    hashtags?: boolean;
    emojis?: boolean;
    temperature?: number;
    model?: string;
  };
}

// Platform-specific character limits
const PLATFORM_LIMITS = {
  twitter: 280,
  linkedin: 3000,
  facebook: 500,
  instagram: 2200,
  generic: 300,
  email: 150,
  meta: 160,
};

// Default prompts for different excerpt types
const EXCERPT_PROMPTS = {
  social: "Create an engaging social media post that captures attention and encourages clicks",
  email: "Write a compelling email preview text that increases open rates",
  card: "Generate a preview snippet for a content card that maximizes click-through",
  meta: "Create an SEO-optimized meta description that improves search visibility",
  summary: "Write a concise summary that gives readers the key takeaway",
};

export class ExcerptService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Generate multiple excerpt variants for A/B testing
   */
  async generateExcerpts(options: ExcerptGenerationOptions): Promise<GeneratedExcerpt[]> {
    const {
      content,
      targetPlatform = 'generic',
      excerptType = 'social',
      tone = 'informative',
      style = 'summary',
      targetAudience = 'general audience',
      callToAction = true,
      hashtags = false,
      emojis = false,
      maxCharacters = PLATFORM_LIMITS[targetPlatform] || PLATFORM_LIMITS.generic,
      temperature = 0.7,
      variantCount = 5, // Changed default to 5
    } = options;

    // Truncate content if too long (keep first 3000 chars for context)
    const truncatedContent = content.length > 3000 
      ? content.substring(0, 3000) + '...' 
      : content;

    const excerpts: GeneratedExcerpt[] = [];
    const variants = ['A', 'B', 'C', 'D', 'E'].slice(0, variantCount);

    for (const variant of variants) {
      const excerpt = await this.generateSingleExcerpt({
        content: truncatedContent,
        targetPlatform,
        excerptType,
        tone,
        style,
        targetAudience,
        callToAction,
        hashtags,
        emojis,
        maxCharacters,
        temperature: temperature + (variant.charCodeAt(0) - 65) * 0.05, // Vary temperature slightly
        variant,
      });
      excerpts.push(excerpt);
    }

    return excerpts;
  }

  /**
   * Generate a single excerpt variant
   */
  private async generateSingleExcerpt(
    options: ExcerptGenerationOptions & { variant: string }
  ): Promise<GeneratedExcerpt> {
    const {
      content,
      targetPlatform = 'generic',
      excerptType = 'social',
      tone,
      style,
      targetAudience,
      callToAction,
      hashtags,
      emojis,
      maxCharacters,
      temperature = 0.7,
      variant,
    } = options;

    const systemPrompt = this.buildSystemPrompt(excerptType, targetPlatform);
    const userPrompt = this.buildUserPrompt({
      content,
      tone,
      style,
      targetAudience,
      callToAction,
      hashtags,
      emojis,
      maxCharacters: maxCharacters || 300,
      variant,
    });

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: Math.min((maxCharacters || 300) * 2, 500), // Approximate tokens from characters
        response_format: { type: "json_object" },
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Ensure excerpt meets character limit
      let excerptText = response.excerpt || '';
      const charLimit = maxCharacters || 300;
      if (excerptText.length > charLimit) {
        excerptText = excerptText.substring(0, charLimit - 3) + '...';
      }

      return {
        text: excerptText,
        characterCount: excerptText.length,
        wordCount: excerptText.split(/\s+/).filter((word: string) => word.length > 0).length,
        variant,
        metadata: response.metadata,
        generationParams: {
          tone,
          style,
          targetAudience,
          callToAction,
          hashtags,
          emojis,
          temperature,
          model: "gpt-3.5-turbo",
        },
      };
    } catch (error) {
      console.error('Error generating excerpt:', error);
      // Fallback to simple extraction
      return this.createFallbackExcerpt(content, maxCharacters!, variant, {
        tone,
        style,
        targetAudience,
        callToAction,
        hashtags,
        emojis,
        temperature,
        model: "fallback",
      });
    }
  }

  /**
   * Build system prompt based on excerpt type and platform
   */
  private buildSystemPrompt(excerptType: string, targetPlatform: string): string {
    return `You are an expert content strategist specializing in creating high-converting preview snippets and social media posts. 
    
Your task is to generate a ${excerptType} excerpt optimized for ${targetPlatform}.

${EXCERPT_PROMPTS[excerptType as keyof typeof EXCERPT_PROMPTS] || EXCERPT_PROMPTS.social}

You must return a JSON object with the following structure:
{
  "excerpt": "The generated excerpt text",
  "metadata": {
    "title": "Optional title for Open Graph/Twitter Card",
    "description": "Optional meta description",
    "twitterCard": "summary or summary_large_image",
    "ogType": "article, website, etc."
  }
}

Key requirements:
1. The excerpt must be compelling and encourage clicks
2. Use active voice and strong verbs
3. Create curiosity without being clickbait
4. Include specific benefits or value propositions
5. Optimize for the target platform's best practices`;
  }

  /**
   * Build user prompt with specific requirements
   */
  private buildUserPrompt(options: {
    content: string;
    tone?: string;
    style?: string;
    targetAudience?: string;
    callToAction?: boolean;
    hashtags?: boolean;
    emojis?: boolean;
    maxCharacters: number;
    variant: string;
  }): string {
    const {
      content,
      tone,
      style,
      targetAudience,
      callToAction,
      hashtags,
      emojis,
      maxCharacters,
      variant,
    } = options;

    let prompt = `Generate variant ${variant} of an excerpt for the following content:\n\n${content}\n\n`;
    prompt += `Requirements:\n`;
    prompt += `- Maximum ${maxCharacters} characters\n`;
    
    if (tone) prompt += `- Tone: ${tone}\n`;
    if (style) prompt += `- Style: ${style}\n`;
    if (targetAudience) prompt += `- Target audience: ${targetAudience}\n`;
    if (callToAction) prompt += `- Include a clear call-to-action\n`;
    if (hashtags) prompt += `- Include 2-3 relevant hashtags\n`;
    if (emojis) prompt += `- Include appropriate emojis for emphasis\n`;

    // Variant-specific instructions
    const variantInstructions = {
      'A': 'Focus on the main benefit or key insight',
      'B': 'Lead with an intriguing question or statistic',
      'C': 'Emphasize emotional appeal or storytelling',
      'D': 'Use action-oriented language and urgency',
      'E': 'Highlight unique or surprising elements',
    };

    prompt += `\nVariant ${variant} focus: ${variantInstructions[variant as keyof typeof variantInstructions] || variantInstructions['A']}\n`;

    return prompt;
  }

  /**
   * Create fallback excerpt when API fails
   */
  private createFallbackExcerpt(
    content: string,
    maxCharacters: number,
    variant: string,
    generationParams: any
  ): GeneratedExcerpt {
    // Find the first substantial paragraph
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
    let excerpt = paragraphs[0] || content;

    // Clean and truncate
    excerpt = excerpt
      .replace(/\s+/g, ' ')
      .trim();

    if (excerpt.length > maxCharacters) {
      // Try to cut at a sentence boundary
      const sentences = excerpt.match(/[^.!?]+[.!?]+/g) || [excerpt];
      excerpt = '';
      for (const sentence of sentences) {
        if ((excerpt + sentence).length <= maxCharacters - 3) {
          excerpt += sentence;
        } else {
          break;
        }
      }
      if (!excerpt) {
        excerpt = content.substring(0, maxCharacters - 3);
      }
      excerpt = excerpt.trim() + '...';
    }

    return {
      text: excerpt,
      characterCount: excerpt.length,
      wordCount: excerpt.split(/\s+/).filter((word: string) => word.length > 0).length,
      variant,
      generationParams,
    };
  }

  /**
   * Optimize existing excerpt based on performance data
   */
  async optimizeExcerpt(
    originalExcerpt: string,
    performanceData: {
      ctr: number;
      shareRate: number;
      engagementRate: number;
    },
    targetCTR: number = 0.2 // 20% improvement target
  ): Promise<GeneratedExcerpt> {
    const needsImprovement = performanceData.ctr < targetCTR;
    
    if (!needsImprovement) {
      return {
        text: originalExcerpt,
        characterCount: originalExcerpt.length,
        wordCount: originalExcerpt.split(/\s+/).filter((word: string) => word.length > 0).length,
        variant: 'OPTIMIZED',
        generationParams: {
          model: "unchanged",
        },
      };
    }

    const systemPrompt = `You are an expert at optimizing content for engagement. 
    The current excerpt has a CTR of ${(performanceData.ctr * 100).toFixed(1)}% but needs to reach ${(targetCTR * 100).toFixed(1)}%.
    
    Analyze what might be preventing clicks and create an improved version that:
    1. Creates stronger curiosity or urgency
    2. Highlights clearer value or benefits
    3. Uses more compelling language
    4. Addresses the target audience's pain points better
    
    Return a JSON object with:
    {
      "excerpt": "The optimized excerpt text",
      "changes": ["List of specific improvements made"]
    }`;

    const userPrompt = `Current excerpt: "${originalExcerpt}"
    
    Performance metrics:
    - Click-through rate: ${(performanceData.ctr * 100).toFixed(1)}%
    - Share rate: ${(performanceData.shareRate * 100).toFixed(1)}%
    - Engagement rate: ${(performanceData.engagementRate * 100).toFixed(1)}%
    
    Generate an optimized version that will achieve at least ${(targetCTR * 100).toFixed(1)}% CTR.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      const optimizedText = response.excerpt || originalExcerpt;

      return {
        text: optimizedText,
        characterCount: optimizedText.length,
        wordCount: optimizedText.split(/\s+/).filter((word: string) => word.length > 0).length,
        variant: 'OPTIMIZED',
        generationParams: {
          model: "gpt-3.5-turbo",
          temperature: 0.8,
        },
      };
    } catch (error) {
      console.error('Error optimizing excerpt:', error);
      return {
        text: originalExcerpt,
        characterCount: originalExcerpt.length,
        wordCount: originalExcerpt.split(/\s+/).filter((word: string) => word.length > 0).length,
        variant: 'OPTIMIZED',
        generationParams: {
          model: "error",
        },
      };
    }
  }

  /**
   * Generate social media metadata for an excerpt
   */
  async generateSocialMetadata(
    excerpt: string,
    content: string,
    platform: string
  ): Promise<any> {
    const prompt = `Based on this excerpt and content, generate optimal social media metadata for ${platform}:
    
    Excerpt: "${excerpt}"
    
    Content preview: "${content.substring(0, 500)}..."
    
    Return a JSON object with appropriate Open Graph and Twitter Card metadata.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "You are an expert in social media optimization and metadata generation. Generate metadata that maximizes visibility and engagement." 
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Error generating social metadata:', error);
      return {
        title: excerpt.substring(0, 60),
        description: excerpt,
        twitterCard: 'summary',
        ogType: 'article',
      };
    }
  }
}

// Export singleton instance
export const excerptService = new ExcerptService();