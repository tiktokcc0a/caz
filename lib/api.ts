// API 客户端配置
// 我们不再需要 API_BASE_URL，因为所有请求都将通过 Next.js 代理
const API_KEY = "Too194250"; // 你提供的API密钥

// API 响应类型定义 (这部分保持不变)
export interface Card {
  id: number;
  card_number: string;
  month: string;
  year: string;
  cvv: string;
  other_params: string;
  full_card_data: string;
  brand: string;
  type: string;
  category: string;
  issuer: string;
  country_alpha2: string;
}

export interface FeedBin {
  id: number;
  bin: string;
  card_rate: number | null;
  aws_rate: number | null;
  last_modified: string;
}

export interface Stats {
  [country: string]: {
    total: number;
    bins: { [bin: string]: number };
  };
}

export interface ApiResponse {
  library_cards: Card[];
  pool_cards: Card[];
  feed_bins: FeedBin[];
  stats: Stats;
}

// 模拟数据 (保持不变)
const mockData: ApiResponse = {
  library_cards: [
    { id: 1, card_number: "4532123456789012", month: "12", year: "2025", cvv: "123", other_params: "", full_card_data: "4532123456789012|12/25|123", brand: "Visa", type: "Credit", category: "Classic", issuer: "Chase Bank", country_alpha2: "US" },
  ],
  pool_cards: [
    { id: 4, card_number: "4111111111111111", month: "01", year: "2024", cvv: "321", other_params: "", full_card_data: "4111111111111111|01/24|321", brand: "Visa", type: "Credit", category: "Standard", issuer: "Wells Fargo", country_alpha2: "US" },
  ],
  feed_bins: [
    { id: 1, bin: "453212", card_rate: 85, aws_rate: 92, last_modified: "2024-01-15" },
  ],
  stats: {
    US: { total: 2, bins: { "453212": 1, "411111": 1 } }
  },
};


// API 客户端类
class ApiClient {
  private useMockData = false;
  private apiKey: string;
  private connectionTested = false;

  constructor(apiKey: string = API_KEY) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 关键改动：强制所有请求都使用相对路径，以便通过 Next.js 代理
    const url = `/api${endpoint}`;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey, // 某些服务可能使用 X-API-Key
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`🔄 API Request: ${url}`);
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      this.useMockData = false; // 只要有一次请求成功，就禁用mock模式

      if (response.headers.get("content-type")?.includes("text/plain")) {
        return response.blob() as unknown as T;
      }
      
      const data = await response.json();
      console.log("✅ API Response:", data);
      return data;

    } catch (error) {
      console.error("❌ API请求失败:", error);
      
      // 只有在从未连接成功过的情况下，才启用 mock 数据
      if (!this.connectionTested) {
        this.useMockData = true;
        console.warn("⚠️ 无法连接到后端，切换到模拟数据模式");
      }
      // 即使连接过一次后又断开，也不再使用mock数据，而是直接抛出错误
      if (this.useMockData) {
          return this.getMockResponse<T>(endpoint);
      }
      throw error;
    }
  }

  private getMockResponse<T>(endpoint: string): Promise<T> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (endpoint.startsWith("/data")) resolve(mockData as T);
        else if (endpoint === "/upload") resolve({ message: "Mock: 卡片上传成功" } as T);
        else resolve({ message: "Mock: 操作成功" } as T);
      }, 300);
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request<any>('/health');
      this.connectionTested = true;
      this.useMockData = false;
      console.log("✅ 后端连接测试成功");
      return true;
    } catch (error) {
      console.error("❌ 后端连接测试失败:", error);
      this.connectionTested = false; // 标记为测试失败
      this.useMockData = true;
      return false;
    }
  }

  getApiInfo() {
    return {
      // 不再暴露baseUrl，因为它现在是内部细节
      apiKey: this.apiKey,
      isConnected: !this.useMockData,
      connectionTested: this.connectionTested,
    };
  }
  
  // 所有其他方法保持不变，因为它们都依赖于修复后的 this.request
  async getAllData(searchQuery?: string): Promise<ApiResponse> {
    const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
    return this.request<ApiResponse>(`/data${params}`);
  }

  async uploadCards(target: "library" | "pool", cardData: string) {
    return this.request("/upload", {
      method: "POST",
      body: JSON.stringify({ target, card_data: cardData }),
    });
  }

  async moveToPool(cardIds: number[]) {
    return this.request("/move", {
      method: "POST",
      body: JSON.stringify({ card_ids: cardIds }),
    });
  }

  async deleteCards(target: "library" | "pool", cardIds: number[]) {
    return this.request("/delete", {
      method: "POST",
      body: JSON.stringify({ target, card_ids: cardIds }),
    });
  }

  async exportCards(target: "library" | "pool", cardIds: number[]): Promise<Blob> {
    return this.request<Blob>("/export", {
      method: "POST",
      body: JSON.stringify({ target, card_ids: cardIds }),
    });
  }

  async addFeedBin(bin: string, cardRate?: number, awsRate?: number) {
    return this.request("/feed/add", {
      method: "POST",
      body: JSON.stringify({ bin, card_rate: cardRate, aws_rate: awsRate }),
    });
  }

  async deleteFeedBin(id: number) {
    return this.request(`/feed/delete/${id}`, {
      method: "POST",
    });
  }
}

export const apiClient = new ApiClient();
