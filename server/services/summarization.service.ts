/**
 * Summarization Service
 * 
 * Handles AI-powered text summarization using OpenAI GPT-3.5-turbo.
 * Supports multiple summary formats: TL;DR, bullet points, and paragraph.
 */

import { openai } from "../openai";

export interface SummarizationOptions {
  content: string;
  type: 'tldr' | 'bullet' | 'paragraph';
  length?: number; // 1-3 for sentences, or number of bullets
  extractKeyPoints?: boolean;
}

export interface SummarizationResult {
  summary: string;
  wordCount: number;
  originalWordCount: number;
  keyPoints?: string[];
  metadata?: {
    model: string;
    temperature: number;
    tokensUsed?: number;
    processingTime: number;
  };
}

/**
 * Count words in a text string
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Generate a system prompt based on summary type and length
 */
function getSystemPrompt(type: 'tldr' | 'bullet' | 'paragraph', length: number): string {
  switch (type) {
    case 'tldr':
      return `You are an expert summarizer. Create an ultra-concise TL;DR summary in exactly ${length} sentences. 
      Focus on the absolute most important information. Be direct and clear.`;
    
    case 'bullet':
      return `You are an expert summarizer. Create a summary with exactly ${length} bullet points.
      Each bullet should capture a key point or insight. Start each bullet with "• ".
      Keep each bullet concise but informative.`;
    
    case 'paragraph':
      return `You are an expert summarizer. Create a single paragraph summary of ${length} sentences.
      Make it flow naturally while capturing the essential information.
      Ensure the paragraph is coherent and well-structured.`;
    
    default:
      return `You are an expert summarizer. Create a concise summary.`;
  }
}

/**
 * Generate a summary using OpenAI
 */
export async function generateSummary(options: SummarizationOptions): Promise<SummarizationResult> {
  const startTime = Date.now();
  const {
    content,
    type = 'tldr',
    length = 2,
    extractKeyPoints = false
  } = options;

  // Count original words
  const originalWordCount = countWords(content);

  try {
    // Prepare the messages for the API
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: getSystemPrompt(type, length)
      },
      {
        role: "user",
        content: `Please summarize the following text:\n\n${content}`
      }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.3, // Lower temperature for more consistent summaries
      max_tokens: type === 'bullet' ? 300 : 200, // More tokens for bullet points
    });

    const summary = completion.choices[0]?.message?.content || "";
    const wordCount = countWords(summary);

    // Extract key points if requested
    let keyPoints: string[] | undefined;
    if (extractKeyPoints) {
      keyPoints = await extractKeyPointsFromContent(content);
    }

    const processingTime = Date.now() - startTime;

    return {
      summary,
      wordCount,
      originalWordCount,
      keyPoints,
      metadata: {
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        tokensUsed: completion.usage?.total_tokens,
        processingTime
      }
    };
  } catch (error) {
    console.error('[Summarization] Error generating summary:', error);
    throw new Error('Failed to generate summary');
  }
}

/**
 * Extract key points from content
 */
async function extractKeyPointsFromContent(content: string): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Extract 3-5 key points from the text. Each point should be a single, clear statement.
          Return only the key points, one per line, without numbers or bullets.`
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const response = completion.choices[0]?.message?.content || "";
    return response
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim());
  } catch (error) {
    console.error('[Summarization] Error extracting key points:', error);
    return [];
  }
}

/**
 * Batch summarize multiple pieces of content
 */
export async function batchSummarize(
  items: Array<{ id: string; content: string; options?: Partial<SummarizationOptions> }>
): Promise<Array<{ id: string; result: SummarizationResult | null; error?: string }>> {
  const results = await Promise.allSettled(
    items.map(async (item) => {
      try {
        const result = await generateSummary({
          content: item.content,
          type: item.options?.type || 'tldr',
          length: item.options?.length || 2,
          extractKeyPoints: item.options?.extractKeyPoints || false
        });
        return { id: item.id, result };
      } catch (error) {
        return { 
          id: item.id, 
          result: null, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    })
  );

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        id: '',
        result: null,
        error: result.reason?.message || 'Failed to summarize'
      };
    }
  });
}

/**
 * Format summary based on type for display
 */
export function formatSummary(summary: string, type: 'tldr' | 'bullet' | 'paragraph'): string {
  switch (type) {
    case 'tldr':
      return `**TL;DR:** ${summary}`;
    
    case 'bullet':
      // Ensure bullets are properly formatted
      const lines = summary.split('\n').filter(line => line.trim());
      return lines.map(line => {
        // Add bullet if not present
        if (!line.trim().startsWith('•')) {
          return `• ${line.trim()}`;
        }
        return line.trim();
      }).join('\n');
    
    case 'paragraph':
      return summary;
    
    default:
      return summary;
  }
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(originalWords: number, summaryWords: number): number {
  if (originalWords === 0) return 0;
  return Math.round((1 - summaryWords / originalWords) * 100);
}