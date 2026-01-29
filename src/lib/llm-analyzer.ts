// LLM Market Analyzer - OpenRouter + OpenAI Support
import type { Market, BettingOpportunity } from '@/types/polymarket';

interface LLMAnalysis {
  market: Market;
  reasoning: string;
  predictedProbability: number;
  confidence: number;
  recommendation: 'YES' | 'NO' | 'SKIP';
  keyFactors: string[];
}

type LLMProvider = 'openrouter' | 'openai';

// [PENTING] Ini adalah export yang hilang dan menyebabkan error
export const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', free: true },
  { id: 'google/gemini-exp-1206:free', name: 'Gemini Exp 1206 (Free)', free: true },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', free: true },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B (Free)', free: true },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)', free: true },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', free: false },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', free: false },
  { id: 'openai/gpt-4o', name: 'GPT-4o', free: false },
];

export class LLMAnalyzer {
  private apiKey: string;
  private provider: LLMProvider;
  private model: string;

  constructor(
    apiKey: string = '',
    provider: LLMProvider = 'openrouter',
    model: string = 'google/gemini-2.0-flash-exp:free'
  ) {
    this.apiKey = apiKey;
    this.provider = provider;
    this.model = model;
  }

  // Get API endpoint based on provider
  private getEndpoint(): string {
    return this.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
  }

  // Analyze a market using LLM
  async analyzeMarket(market: Market): Promise<LLMAnalysis | null> {
    if (!this.apiKey) {
      return this.fallbackAnalysis(market);
    }

    try {
      const prompt = this.buildPrompt(market);
      const response = await this.callLLM(prompt);
      return this.parseResponse(market, response);
    } catch (error) {
      console.error('LLM analysis failed:', error);
      return this.fallbackAnalysis(market);
    }
  }

  // Build analysis prompt
  private buildPrompt(market: Market): string {
    const yesPrice = market.outcomes.find(o => o.name.toLowerCase() === 'yes')?.price || 0.5;
    const noPrice = 1 - yesPrice;

    return `You are an expert prediction market analyst. Analyze this market and provide a trading recommendation.

MARKET QUESTION: "${market.question}"

CURRENT PRICES:
- YES: ${(yesPrice * 100).toFixed(1)}% (buy YES if you think probability is HIGHER)
- NO: ${(noPrice * 100).toFixed(1)}% (buy NO if you think probability is LOWER)

MARKET DATA:
- Liquidity: $${market.liquidity?.toLocaleString() || 'N/A'}
- Volume: $${market.volume?.toLocaleString() || 'N/A'}
- End Date: ${market.endDate || 'Unknown'}
- Category: ${market.category || 'General'}

ANALYSIS TASK:
1. Consider current events, trends, and any relevant information
2. Estimate the TRUE probability of YES outcome
3. Compare with market price to find mispricing
4. If price seems too LOW, recommend YES
5. If price seems too HIGH, recommend NO
6. If price is fair (within 10%), recommend SKIP

Respond ONLY with this exact JSON format:
{
  "reasoning": "2-3 sentence explanation of your analysis",
  "predictedProbability": 0.XX,
  "confidence": 0.XX,
  "recommendation": "YES" or "NO" or "SKIP",
  "keyFactors": ["factor1", "factor2", "factor3"]
}`;
  }

  // Call LLM API
  private async callLLM(prompt: string): Promise<string> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    // OpenRouter requires additional headers
    if (this.provider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Polymarket AI Agent';
    }

    const body = {
      model: this.provider === 'openrouter' ? this.model : 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a prediction market analyst. Respond only with valid JSON, no markdown or explanations.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    };

    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // Parse LLM response
  private parseResponse(market: Market, response: string): LLMAnalysis | null {
    try {
      // Clean response - remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }

      // Extract JSON
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.fallbackAnalysis(market);

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        market,
        reasoning: parsed.reasoning || 'No reasoning provided',
        predictedProbability: Math.max(0, Math.min(1, parseFloat(parsed.predictedProbability) || 0.5)),
        confidence: Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0.5)),
        recommendation: ['YES', 'NO', 'SKIP'].includes(parsed.recommendation) ? parsed.recommendation : 'SKIP',
        keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : [],
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error, response);
      return this.fallbackAnalysis(market);
    }
  }

  // Fallback rule-based analysis
  private fallbackAnalysis(market: Market): LLMAnalysis {
    const yesOutcome = market.outcomes.find(o => o.name.toLowerCase() === 'yes');
    const price = yesOutcome?.price || 0.5;

    let recommendation: 'YES' | 'NO' | 'SKIP' = 'SKIP';
    let predictedProbability = price;
    let confidence = 0.5;
    let reasoning = 'Rule-based analysis: Market appears fairly priced';

    // Mean reversion strategy
    if (price < 0.20) {
      recommendation = 'YES';
      predictedProbability = price + (0.5 - price) * 0.4;
      confidence = 0.65;
      reasoning = `Price at ${(price * 100).toFixed(1)}% appears undervalued. Mean reversion suggests upside potential.`;
    } else if (price > 0.80) {
      recommendation = 'NO';
      predictedProbability = price - (price - 0.5) * 0.4;
      confidence = 0.65;
      reasoning = `Price at ${(price * 100).toFixed(1)}% appears overvalued. Mean reversion suggests downside potential.`;
    } else if (price < 0.35) {
      recommendation = 'YES';
      predictedProbability = price + 0.1;
      confidence = 0.55;
      reasoning = `Price at ${(price * 100).toFixed(1)}% may be slightly undervalued.`;
    } else if (price > 0.65) {
      recommendation = 'NO';
      predictedProbability = price - 0.1;
      confidence = 0.55;
      reasoning = `Price at ${(price * 100).toFixed(1)}% may be slightly overvalued.`;
    }

    return {
      market,
      reasoning,
      predictedProbability,
      confidence,
      recommendation,
      keyFactors: ['Price threshold analysis', 'Mean reversion strategy', 'Liquidity assessment'],
    };
  }

  // Batch analyze markets
  async analyzeMarkets(markets: Market[], maxConcurrent = 2): Promise<LLMAnalysis[]> {
    const results: LLMAnalysis[] = [];

    for (let i = 0; i < markets.length; i += maxConcurrent) {
      const batch = markets.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(m => this.analyzeMarket(m))
      );
      results.push(...batchResults.filter(Boolean) as LLMAnalysis[]);

      // Rate limit delay
      if (i + maxConcurrent < markets.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    return results;
  }

  // Convert analysis to betting opportunity
  analysisToOpportunity(analysis: LLMAnalysis): BettingOpportunity | null {
    if (analysis.recommendation === 'SKIP') return null;

    const yesOutcome = analysis.market.outcomes.find(o => o.name.toLowerCase() === 'yes');
    if (!yesOutcome) return null;

    const marketPrice = yesOutcome.price;
    const isUndervalued = analysis.predictedProbability > marketPrice;

    // Calculate expected value
    let expectedValue: number;
    if (analysis.recommendation === 'YES') {
      const potentialReturn = (1 / marketPrice) - 1;
      expectedValue = (analysis.predictedProbability * potentialReturn) -
                     ((1 - analysis.predictedProbability) * 1);
    } else {
      const noPrice = 1 - marketPrice;
      const potentialReturn = (1 / noPrice) - 1;
      expectedValue = ((1 - analysis.predictedProbability) * potentialReturn) -
                     (analysis.predictedProbability * 1);
    }

    // Only return if EV is positive
    if (expectedValue <= 0.02) return null;

    return {
      market: analysis.market,
      outcome: yesOutcome,
      strategy: isUndervalued ? 'UNDERVALUED' : 'OVERVALUED',
      recommendedBet: analysis.recommendation as 'YES' | 'NO',
      confidence: analysis.confidence,
      suggestedAmount: 0,
      expectedValue,
      reasoning: analysis.reasoning,
      keyFactors: analysis.keyFactors,
    };
  }

  // Setters
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  setModel(model: string): void {
    this.model = model;
  }

  getModel(): string {
    return this.model;
  }

  getProvider(): LLMProvider {
    return this.provider;
  }
}

// Singleton
let analyzerInstance: LLMAnalyzer | null = null;

export const initLLMAnalyzer = (
  apiKey?: string,
  provider?: LLMProvider,
  model?: string
): LLMAnalyzer => {
  analyzerInstance = new LLMAnalyzer(apiKey, provider, model);
  return analyzerInstance;
};

export const getLLMAnalyzer = (): LLMAnalyzer | null => analyzerInstance;