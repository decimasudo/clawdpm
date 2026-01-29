// LLM Market Analyzer - AI-powered market analysis
import type { Market, BettingOpportunity } from '@/types/polymarket';

interface LLMAnalysis {
  market: Market;
  reasoning: string;
  predictedProbability: number;
  confidence: number;
  recommendation: 'YES' | 'NO' | 'SKIP';
  keyFactors: string[];
}

export class LLMAnalyzer {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(apiKey: string = '', endpoint: string = 'https://api.openai.com/v1/chat/completions') {
    this.apiKey = apiKey;
    this.apiEndpoint = endpoint;
  }

  // Analyze a market using LLM
  async analyzeMarket(market: Market): Promise<LLMAnalysis | null> {
    if (!this.apiKey) {
      // Fallback to rule-based analysis if no API key
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

    return `You are a prediction market analyst. Analyze this market and provide your assessment.

MARKET: "${market.question}"

CURRENT PRICES:
- YES: ${(yesPrice * 100).toFixed(1)}%
- NO: ${(noPrice * 100).toFixed(1)}%

MARKET INFO:
- Liquidity: $${market.liquidity.toLocaleString()}
- Volume: $${market.volume.toLocaleString()}
- End Date: ${market.endDate || 'Unknown'}

TASK: Based on your knowledge, analyze if this market is correctly priced.

Respond in this exact JSON format:
{
  "reasoning": "Brief explanation of your analysis (2-3 sentences)",
  "predictedProbability": 0.XX (your estimate of YES probability, 0-1),
  "confidence": 0.XX (how confident you are, 0-1),
  "recommendation": "YES" or "NO" or "SKIP",
  "keyFactors": ["factor1", "factor2", "factor3"]
}

Only respond with valid JSON, no other text.`;
  }

  // Call LLM API
  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a prediction market analyst. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // Parse LLM response
  private parseResponse(market: Market, response: string): LLMAnalysis | null {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        market,
        reasoning: parsed.reasoning || 'No reasoning provided',
        predictedProbability: Math.max(0, Math.min(1, parsed.predictedProbability || 0.5)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        recommendation: parsed.recommendation || 'SKIP',
        keyFactors: parsed.keyFactors || [],
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return null;
    }
  }

  // Fallback analysis without LLM
  private fallbackAnalysis(market: Market): LLMAnalysis {
    const yesOutcome = market.outcomes.find(o => o.name.toLowerCase() === 'yes');
    const price = yesOutcome?.price || 0.5;

    // Simple mean-reversion logic
    let recommendation: 'YES' | 'NO' | 'SKIP' = 'SKIP';
    let predictedProbability = price;
    let confidence = 0.5;

    if (price < 0.25) {
      recommendation = 'YES';
      predictedProbability = price + (0.5 - price) * 0.3;
      confidence = 0.6;
    } else if (price > 0.75) {
      recommendation = 'NO';
      predictedProbability = price - (price - 0.5) * 0.3;
      confidence = 0.6;
    }

    return {
      market,
      reasoning: `Rule-based analysis: Price at ${(price * 100).toFixed(1)}% suggests ${
        price < 0.25 ? 'undervalued YES' : price > 0.75 ? 'overvalued YES' : 'fair value'
      }`,
      predictedProbability,
      confidence,
      recommendation,
      keyFactors: ['Price threshold', 'Mean reversion assumption', 'Liquidity check'],
    };
  }

  // Batch analyze multiple markets
  async analyzeMarkets(markets: Market[], maxConcurrent = 3): Promise<LLMAnalysis[]> {
    const results: LLMAnalysis[] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < markets.length; i += maxConcurrent) {
      const batch = markets.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(m => this.analyzeMarket(m))
      );
      results.push(...batchResults.filter(Boolean) as LLMAnalysis[]);

      // Rate limit delay
      if (i + maxConcurrent < markets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Convert LLM analysis to betting opportunity
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
    if (expectedValue <= 0.03) return null;

    return {
      market: analysis.market,
      outcome: yesOutcome,
      strategy: isUndervalued ? 'UNDERVALUED' : 'OVERVALUED',
      recommendedBet: analysis.recommendation as 'YES' | 'NO',
      confidence: analysis.confidence,
      suggestedAmount: 0,
      expectedValue,
    };
  }

  // Update API key
  setApiKey(key: string): void {
    this.apiKey = key;
  }
}

// Export singleton
let analyzerInstance: LLMAnalyzer | null = null;

export const initLLMAnalyzer = (apiKey?: string): LLMAnalyzer => {
  analyzerInstance = new LLMAnalyzer(apiKey);
  return analyzerInstance;
};

export const getLLMAnalyzer = (): LLMAnalyzer | null => analyzerInstance;
