import { MathProblem } from './types';

/**
 * AIService handles OpenAI integration for "Option C": Scenario Wrapping.
 * It takes a mathematically sound problem and uses an LLM to add narrative context.
 */
export class AIService {
  private static apiKey: string | null = process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;

  /**
   * Wraps a base math problem in an AI-generated scenario.
   * This modifies the 'instruction' and 'find' strings while preserving the numbers.
   */
  static async wrapWithScenario(problem: MathProblem): Promise<MathProblem> {
    if (!this.apiKey) {
      console.warn("AIService: No API key found. Returning original problem.");
      return problem;
    }

    try {
      // In a real implementation, we would call fetch('https://api.openai.com/v1/chat/completions')
      // For this MVP foundation, we provide the template for the call.
      
      const prompt = `
        You are an expert math curriculum designer. 
        Take the following geometry problem and wrap it in a creative, real-world scenario suitable for a high school student.
        Do NOT change the underlying numbers or the math.
        
        Original Problem:
        Type: ${problem.type}
        Find: ${'find' in problem ? problem.find : 'Probability'}
        Answer: ${problem.answer}
        
        Return the new 'instruction' and 'find' text as JSON.
      `;

      // Simulating an AI response for now to ensure the UI loop works
      // The user can rotate their API key and hook this up.
      const result = { ...problem };
      if ('find' in result) {
        (result as any).find = (result as any).find + " (AI-Enhanced Scenario)";
      }
      return result;
    } catch (error) {
      console.error("AIService Error:", error);
      return problem;
    }
  }

  static isConfigured(): boolean {
    return !!this.apiKey;
  }
}
