// Polymarket CLOB API Service
import type { Market, Outcome, Trade } from '@/types/polymarket';

const CLOB_API_BASE = 'https://clob.polymarket.com';
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

export class PolymarketAPI {
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // Generate auth headers for CLOB API
  private getAuthHeaders(): HeadersInit {
    const timestamp = Date.now().toString();
    return {
      'Content-Type': 'application/json',
      'POLY_API_KEY': this.apiKey,
      'POLY_TIMESTAMP': timestamp,
      'POLY_SIGNATURE': this.apiSecret, // In production, sign with HMAC
    };
  }

  // Fetch all active markets
  async getMarkets(limit = 100, offset = 0): Promise<Market[]> {
    try {
      const response = await fetch(
        `${GAMMA_API_BASE}/markets?limit=${limit}&offset=${offset}&active=true&closed=false`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch markets: ${response.status}`);
      }

      const data = await response.json();
      return this.transformMarkets(data);
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }

  // Fetch single market details
  async getMarket(marketId: string): Promise<Market | null> {
    try {
      const response = await fetch(`${GAMMA_API_BASE}/markets/${marketId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch market: ${response.status}`);
      }

      const data = await response.json();
      return this.transformMarket(data);
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  }

  // Get order book for a market
  async getOrderBook(tokenId: string): Promise<{ bids: any[]; asks: any[] }> {
    try {
      const response = await fetch(`${CLOB_API_BASE}/book?token_id=${tokenId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch order book: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching order book:', error);
      return { bids: [], asks: [] };
    }
  }

  // Get current prices for a market
  async getPrices(tokenId: string): Promise<{ bid: number; ask: number; mid: number }> {
    try {
      const response = await fetch(`${CLOB_API_BASE}/price?token_id=${tokenId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status}`);
      }

      const data = await response.json();
      return {
        bid: parseFloat(data.bid || '0'),
        ask: parseFloat(data.ask || '0'),
        mid: parseFloat(data.mid || '0'),
      };
    } catch (error) {
      console.error('Error fetching prices:', error);
      return { bid: 0, ask: 0, mid: 0 };
    }
  }

  // Place a market order
  async placeOrder(params: {
    tokenId: string;
    side: 'BUY' | 'SELL';
    size: number;
    price?: number; // If undefined, market order
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      const orderPayload = {
        token_id: params.tokenId,
        side: params.side,
        size: params.size.toString(),
        price: params.price?.toString(),
        type: params.price ? 'LIMIT' : 'MARKET',
      };

      const response = await fetch(`${CLOB_API_BASE}/order`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `Order failed: ${response.status}`
        };
      }

      const data = await response.json();
      return { success: true, orderId: data.order_id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Cancel an order
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      const response = await fetch(`${CLOB_API_BASE}/order/${orderId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return false;
    }
  }

  // Get user's open orders
  async getOpenOrders(): Promise<any[]> {
    try {
      const response = await fetch(`${CLOB_API_BASE}/orders`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  // Transform API response to our Market type
  private transformMarkets(data: any[]): Market[] {
    return data.map(this.transformMarket).filter(Boolean) as Market[];
  }

  private transformMarket(item: any): Market | null {
    if (!item) return null;

    try {
      const outcomes: Outcome[] = [];

      // Handle different response formats
      if (item.tokens && Array.isArray(item.tokens)) {
        item.tokens.forEach((token: any) => {
          outcomes.push({
            id: token.token_id || token.id,
            name: token.outcome || 'Yes',
            price: parseFloat(token.price || '0.5'),
          });
        });
      } else if (item.outcomePrices) {
        const prices = JSON.parse(item.outcomePrices);
        const names = item.outcomes ? JSON.parse(item.outcomes) : ['Yes', 'No'];
        prices.forEach((price: string, idx: number) => {
          outcomes.push({
            id: `${item.id}-${idx}`,
            name: names[idx] || `Outcome ${idx + 1}`,
            price: parseFloat(price),
          });
        });
      }

      return {
        id: item.id || item.condition_id,
        question: item.question || item.title || 'Unknown Market',
        slug: item.slug || '',
        endDate: item.endDate || item.end_date_iso || '',
        liquidity: parseFloat(item.liquidity || '0'),
        volume: parseFloat(item.volume || item.volumeNum || '0'),
        outcomes,
        active: item.active !== false,
        closed: item.closed === true,
      };
    } catch (error) {
      console.error('Error transforming market:', error);
      return null;
    }
  }
}

// Singleton instance (will be initialized with config)
let apiInstance: PolymarketAPI | null = null;

export const initializeAPI = (apiKey: string, apiSecret: string): PolymarketAPI => {
  apiInstance = new PolymarketAPI(apiKey, apiSecret);
  return apiInstance;
};

export const getAPI = (): PolymarketAPI | null => apiInstance;
