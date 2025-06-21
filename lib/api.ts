// API 客户端配置
const API_KEY = "Too194250" // 你提供的API密钥

// API 响应类型定义 (这部分保持不变)
export interface Card {
  id: number
  card_number: string
  month: string
  year: string
  cvv: string
  other_params: string
  full_card_data: string
  brand: string
  type: string
  category: string
  issuer: string
  country_alpha2: string
}

export interface FeedBin {
  id: number
  bin: string
  card_rate: number | null
  aws_rate: number | null
  last_modified: string
}

export interface Stats {
  [country: string]: {
    total: number
    bins: { [bin: string]: number }
  }
}

export interface ApiResponse {
  library_cards: Card[]
  pool_cards: Card[]
  feed_bins: FeedBin[]
  stats: Stats
}

// 模拟数据
const mockData: ApiResponse = {
  library_cards: [
    {
      id: 1,
      card_number: "4532123456789012",
      month: "12",
      year: "2025",
      cvv: "123",
      other_params: "",
      full_card_data: "4532123456789012|12/25|123",
      brand: "Visa",
      type: "Credit",
      category: "Classic",
      issuer: "Chase Bank",
      country_alpha2: "US",
    },
    {
      id: 2,
      card_number: "5555555555554444",
      month: "11",
      year: "2026",
      cvv: "456",
      other_params: "",
      full_card_data: "5555555555554444|11/26|456",
      brand: "Mastercard",
      type: "Debit",
      category: "Standard",
      issuer: "Bank of America",
      country_alpha2: "US",
    },
    {
      id: 3,
      card_number: "378282246310005",
      month: "10",
      year: "2024",
      cvv: "789",
      other_params: "",
      full_card_data: "378282246310005|10/24|789",
      brand: "American Express",
      type: "Credit",
      category: "Gold",
      issuer: "American Express",
      country_alpha2: "US",
    },
  ],
  pool_cards: [
    {
      id: 4,
      card_number: "4111111111111111",
      month: "01",
      year: "2024",
      cvv: "321",
      other_params: "",
      full_card_data: "4111111111111111|01/24|321",
      brand: "Visa",
      type: "Credit",
      category: "Standard",
      issuer: "Wells Fargo",
      country_alpha2: "US",
    },
    {
      id: 5,
      card_number: "5105105105105100",
      month: "02",
      year: "2025",
      cvv: "654",
      other_params: "",
      full_card_data: "5105105105105100|02/25|654",
      brand: "Mastercard",
      type: "Credit",
      category: "Platinum",
      issuer: "Citibank",
      country_alpha2: "CA",
    },
  ],
  feed_bins: [
    { id: 1, bin: "453212", card_rate: 85, aws_rate: 92, last_modified: "2024-01-15" },
    { id: 2, bin: "555555", card_rate: 78, aws_rate: 88, last_modified: "2024-01-14" },
    { id: 3, bin: "378282", card_rate: 95, aws_rate: 97, last_modified: "2024-01-13" },
  ],
  stats: {
    US: { total: 4, bins: { "453212": 2, "555555": 1, "378282": 1 } },
    CA: { total: 1, bins: { "510510": 1 } },
  },
}

// API 客户端类
class ApiClient {
  private useMockData = true // 默认使用mock数据，直到连接测试成功
  private apiKey: string
  private connectionTested = false
  private isTestingConnection = false

  constructor(apiKey: string = API_KEY) {
    this.apiKey = apiKey
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // 如果正在测试连接，等待测试完成
    if (this.isTestingConnection && endpoint !== "/health") {
      await this.waitForConnectionTest()
    }

    // 如果已经确定使用mock数据，直接返回mock响应
    if (this.useMockData && endpoint !== "/health") {
      console.log(`🎭 Using mock data for: ${endpoint}`)
      return this.getMockResponse<T>(endpoint)
    }

    const url = `/api${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
        ...options.headers,
      },
      ...options,
    }

    try {
      console.log(`🔄 API Request: ${url}`)
      const response = await fetch(url, config)

      // 检查响应的Content-Type
      const contentType = response.headers.get("content-type")

      if (!response.ok) {
        // 如果是HTML响应（通常是错误页面），说明后端不可用
        if (contentType?.includes("text/html")) {
          throw new Error(`Backend not available: received HTML instead of JSON (HTTP ${response.status})`)
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // 检查是否是JSON响应
      if (!contentType?.includes("application/json")) {
        // 如果不是JSON，可能是文件下载等
        if (endpoint === "/export") {
          return response.blob() as unknown as T
        }
        throw new Error(`Expected JSON response but received: ${contentType}`)
      }

      const data = await response.json()
      console.log("✅ API Response:", data)

      // 标记连接成功
      if (endpoint === "/health") {
        this.connectionTested = true
        this.useMockData = false
      }

      return data
    } catch (error) {
      console.error("❌ API请求失败:", error)

      // 如果是健康检查失败，标记为使用mock数据
      if (endpoint === "/health") {
        this.useMockData = true
        this.connectionTested = false
      }

      // 如果是网络错误或HTML响应，且不是健康检查，使用mock数据
      if (
        endpoint !== "/health" &&
        (error instanceof TypeError ||
          (error instanceof Error &&
            (error.message.includes("HTML instead of JSON") || error.message.includes("Expected JSON response"))))
      ) {
        console.warn("⚠️ 后端服务不可用，使用模拟数据")
        this.useMockData = true
        return this.getMockResponse<T>(endpoint)
      }

      // 其他错误直接抛出
      throw error
    }
  }

  private async waitForConnectionTest(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isTestingConnection) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
  }

  private getMockResponse<T>(endpoint: string): Promise<T> {
    return new Promise((resolve) => {
      setTimeout(
        () => {
          console.log(`🎭 Mock Response for: ${endpoint}`)

          if (endpoint.startsWith("/data")) {
            resolve(mockData as T)
          } else if (endpoint === "/upload") {
            resolve({ message: "Mock: 卡片上传成功" } as T)
          } else if (endpoint === "/move") {
            resolve({ message: "Mock: 卡片移动成功" } as T)
          } else if (endpoint === "/delete") {
            resolve({ message: "Mock: 卡片删除成功" } as T)
          } else if (endpoint === "/export") {
            // 创建一个模拟的文本文件
            const mockContent = "4532123456789012|12/25|123\n5555555555554444|11/26|456"
            const blob = new Blob([mockContent], { type: "text/plain" })
            resolve(blob as T)
          } else if (endpoint.startsWith("/feed/add")) {
            resolve({ message: "Mock: BIN添加成功" } as T)
          } else if (endpoint.startsWith("/feed/delete")) {
            resolve({ message: "Mock: BIN删除成功" } as T)
          } else if (endpoint === "/health") {
            resolve({ status: "ok", message: "Mock: 健康检查通过" } as T)
          } else {
            resolve({ message: "Mock: 操作成功" } as T)
          }
        },
        300 + Math.random() * 200,
      ) // 随机延迟300-500ms模拟网络请求
    })
  }

  async testConnection(): Promise<boolean> {
    this.isTestingConnection = true

    try {
      // 尝试连接健康检查端点
      await this.request<any>("/health")
      this.connectionTested = true
      this.useMockData = false
      console.log("✅ 后端连接测试成功")
      return true
    } catch (error) {
      console.error("❌ 后端连接测试失败:", error)
      this.connectionTested = false
      this.useMockData = true
      return false
    } finally {
      this.isTestingConnection = false
    }
  }

  getApiInfo() {
    return {
      apiKey: this.apiKey,
      isConnected: !this.useMockData && this.connectionTested,
      connectionTested: this.connectionTested,
      usingMockData: this.useMockData,
      isTestingConnection: this.isTestingConnection,
    }
  }

  // 强制使用mock数据（用于演示模式）
  forceMockMode() {
    this.useMockData = true
    this.connectionTested = false
  }

  // 所有其他方法保持不变
  async getAllData(searchQuery?: string): Promise<ApiResponse> {
    const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ""
    return this.request<ApiResponse>(`/data${params}`)
  }

  async uploadCards(target: "library" | "pool", cardData: string) {
    return this.request("/upload", {
      method: "POST",
      body: JSON.stringify({ target, card_data: cardData }),
    })
  }

  async moveToPool(cardIds: number[]) {
    return this.request("/move", {
      method: "POST",
      body: JSON.stringify({ card_ids: cardIds }),
    })
  }

  async deleteCards(target: "library" | "pool", cardIds: number[]) {
    return this.request("/delete", {
      method: "POST",
      body: JSON.stringify({ target, card_ids: cardIds }),
    })
  }

  async exportCards(target: "library" | "pool", cardIds: number[]): Promise<Blob> {
    return this.request<Blob>("/export", {
      method: "POST",
      body: JSON.stringify({ target, card_ids: cardIds }),
    })
  }

  async addFeedBin(bin: string, cardRate?: number, awsRate?: number) {
    return this.request("/feed/add", {
      method: "POST",
      body: JSON.stringify({ bin, card_rate: cardRate, aws_rate: awsRate }),
    })
  }

  async deleteFeedBin(id: number) {
    return this.request(`/feed/delete/${id}`, {
      method: "POST",
    })
  }
}

export const apiClient = new ApiClient()
