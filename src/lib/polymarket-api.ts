import CryptoJS from 'crypto-js';
import type { Market, Outcome } from '@/types/polymarket';

// [PENTING] Gunakan jalur Proxy yang sudah disetting di vite.config.ts
// Jangan gunakan https://gamma-api... secara langsung di sini agar tidak kena CORS
const GAMMA_API = '/api/gamma';
const CLOB_API = '/api/clob';

export class PolymarketAPI {
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;

  constructor(apiKey: string = '', apiSecret: string = '', passphrase: string = '') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  // Helper: Membuat Tanda Tangan Digital (Signature) HMAC-SHA256
  private signRequest(timestamp: string, method: string, path: string, body: string = ''): string {
    const message = timestamp + method + path + body;
    const signature = CryptoJS.HmacSHA256(message, this.apiSecret);
    return CryptoJS.enc.Base64.stringify(signature);
  }

  // 1. Fetch Active Markets (Dengan Debug & Proxy)
  async getMarkets(limit = 50, offset = 0): Promise<Market[]> {
    try {
      console.log(`[API] Requesting markets from: ${GAMMA_API}...`);

      const response = await fetch(
        `${GAMMA_API}/markets?closed=false&limit=${limit}&offset=${offset}&active=true&order=volume&ascending=false`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        // Log jika server menolak request
        console.error('[API Error]', response.status, await response.text());
        return [];
      }

      const data = await response.json();

      // [DEBUG] Tampilkan sampel data mentah ke Console
      // Ini sangat penting untuk melihat apakah Polymarket mengubah nama kolom (misal: 'tokens' jadi 'outcomes')
      if (Array.isArray(data) && data.length > 0) {
        console.log('[API DEBUG] Sample Raw Data (Item 0):', data[0]);
      } else {
        console.log('[API DEBUG] Data returned is empty or not an array:', data);
      }

      return this.transformMarkets(data);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
      return [];
    }
  }

  // 2. Get Real-time Prices (Order Book)
  async getPrices(tokenId: string): Promise<{ bid: number; ask: number; mid: number }> {
    try {
      const response = await fetch(`${CLOB_API}/price?token_id=${tokenId}`);
      if (!response.ok) return { bid: 0.5, ask: 0.5, mid: 0.5 };
      const data = await response.json();
      return {
        bid: parseFloat(data.bid || '0.5'),
        ask: parseFloat(data.ask || '0.5'),
        mid: parseFloat(data.mid || '0.5'),
      };
    } catch {
      return { bid: 0.5, ask: 0.5, mid: 0.5 };
    }
  }

  // 3. Place Order (Trading Eksekusi)
  async placeOrder(params: {
    tokenId: string;
    side: 'BUY' | 'SELL';
    size: number;
    price?: number;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    
    if (!this.hasCredentials()) {
      return { success: false, error: 'API Key, Secret, & Passphrase required' };
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = 'POST';
    const path = '/order';
    
    const body = JSON.stringify({
      token_id: params.tokenId,
      side: params.side,
      size: params.size,
      price: params.price,
      type: params.price ? 'LIMIT' : 'MARKET',
    });

    const signature = this.signRequest(timestamp, method, path, body);

    try {
      const response = await fetch(`${CLOB_API}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'POLY_API_KEY': this.apiKey,
          'POLY_PASSPHRASE': this.passphrase,
          'POLY_TIMESTAMP': timestamp,
          'POLY_SIGNATURE': signature,
        },
        body: body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Order failed (${response.status}): ${errorText}` };
      }

      const data = await response.json();
      return { success: true, orderId: data.orderID || data.order_id };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // 4. Transform Data (Parsing yang Lebih Kuat)
  private transformMarkets(data: any[]): Market[] {
    if (!Array.isArray(data)) {
        console.warn('[API Warning] Received data is not an array');
        return [];
    }

    const transformed = data.map((item: any) => {
      const outcomes: Outcome[] = [];

      try {
        // Cek Format Baru (active, clobTokenIds)
        if (item.tokens && Array.isArray(item.tokens)) {
          item.tokens.forEach((token: any) => {
            outcomes.push({
              id: token.token_id || '',
              name: token.outcome || 'Yes',
              price: parseFloat(token.price || '0'),
            });
          });
        } 
        // Cek Format Lama/Alternatif (outcomePrices JSON string)
        else if (item.outcomePrices) {
           try {
             const prices = JSON.parse(item.outcomePrices);
             const names = JSON.parse(item.outcomes || '["Yes", "No"]');
             
             prices.forEach((price: any, idx: number) => {
               outcomes.push({
                 id: `${item.id}-${idx}`, // ID sementara jika token_id tidak ada
                 name: names[idx] || `Outcome ${idx}`,
                 price: parseFloat(price),
               });
             });
           } catch (e) { 
             console.warn('Error parsing JSON outcomes for item:', item.id); 
           }
        }
      } catch (e) {
          console.warn('Error parsing market item structure:', item.id);
      }

      // Fallback Darurat: Jika outcomes kosong, buat dummy agar UI tidak crash
      // Ini hanya agar kita bisa melihat judul market dulu di UI
      if (outcomes.length === 0) {
          outcomes.push({ id: 'dummy-yes', name: 'Yes', price: 0.5 }, { id: 'dummy-no', name: 'No', price: 0.5 });
      }

      return {
        id: item.id || String(Math.random()),
        question: item.question || item.title || 'Unknown Market', // Coba field 'title' juga
        slug: item.slug || '',
        endDate: item.endDate || '',
        liquidity: parseFloat(item.liquidity || '0'),
        volume: parseFloat(item.volume || '0'),
        outcomes,
        active: item.active !== false,
        closed: item.closed === true,
        category: item.category || 'General',
        image: item.image || '',
      };
    });

    // Kita izinkan semua market lolos dulu untuk debugging (tidak difilter)
    return transformed;
  }

  // Utils
  hasCredentials(): boolean {
    return !!(this.apiKey && this.apiSecret && this.passphrase);
  }

  setCredentials(apiKey: string, apiSecret: string, passphrase: string): void {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }
}

// Singleton Pattern
let apiInstance: PolymarketAPI | null = null;

export const initializeAPI = (apiKey?: string, apiSecret?: string, passphrase?: string): PolymarketAPI => {
  apiInstance = new PolymarketAPI(apiKey || '', apiSecret || '', passphrase || '');
  return apiInstance;
};

export const getAPI = (): PolymarketAPI => {
  if (!apiInstance) {
    apiInstance = new PolymarketAPI();
  }
  return apiInstance;
};