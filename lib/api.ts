// API 客户端配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://93.127.139.192:10234/api"
const API_KEY = "Too194250" // 你提供的API密钥

// API 响应类型定义
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

// Mock data for development/fallback
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
      card_number: "5555444433332222",
      month: "08",
      year: "2026",
      cvv: "456",
      other_params: "",
      full_card_data: "5555444433332222|08/26|456",
      brand: "Mastercard",
      type: "Debit",
      category: "Gold",
      issuer: "Bank of America",
      country_alpha2: "US",
    },
    {
      id: 3,
      card_number: "4000000000000002",
      month: "03",
      year: "2027",
      cvv: "789",
      other_params: "",
      full_card_data: "4000000000000002|03/27|789",
      brand: "Visa",
      type: "Credit",
      category: "Platinum",
      issuer: "Royal Bank of Canada",
      country_alpha2: "CA",
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
  ],
  feed_bins: [
    {
      id: 1,
      bin: "453212",
      card_rate: 85,
      aws_rate: 92,
      last_modified: "2024-01-15",
    },
    {
      id: 2,
      bin: "555544",
      card_rate: 78,
      aws_rate: 88,
      last_modified: "2024-01-14",
    },
    {
      id: 3,
      bin: "400000",
      card_rate: 95,
      aws_rate: 97,
      last_modified: "2024-01-13",
    },
  ],
  stats: {
    US: {
      total: 3,
      bins: {
        "453212": 1,
        "555544": 1,
        "411111": 1,
      },
    },
    CA: {
      total: 1,
      bins: {
        "400000": 1,
      },
    },
  },
}

// API 客户端类
class ApiClient {
  private baseUrl: string
  private useMockData = false
  private apiKey: string
  private connectionTested = false

  constructor(baseUrl: string = API_BASE_URL, apiKey: string = API_KEY) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "X-API-Key": this.apiKey,
        ...options.headers,
      },
      ...options,
    }

    try {
      console.log(`🔄 API Request: ${url}`)
      console.log(`🔑 API Key: ${this.apiKey}`)

      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // 连接成功，标记为已连接
      if (!this.connectionTested) {
        this.connectionTested = true
        this.useMockData = false
        console.log("✅ 后端连接成功！")
      }

      // 处理文件下载响应
      if (response.headers.get("content-type")?.includes("text/plain")) {
        const blob = await response.blob()
        return blob as unknown as T
      }

      const data = await response.json()
      console.log("✅ API Response:", data)
      return data
    } catch (error) {
      console.error("❌ API请求失败:", error)
      console.error("🔧 后端地址:", this.baseUrl)
      console.error("🔑 API密钥:", this.apiKey)

      // 只在第一次失败时切换到mock模式
      if (!this.connectionTested) {
        this.useMockData = true
        this.connectionTested = true
        console.warn("⚠️ 切换到模拟数据模式")
      }

      return this.getMockResponse<T>(endpoint, options)
    }
  }

  private getMockResponse<T>(endpoint: string, options: RequestInit): Promise<T> {
    return new Promise((resolve) => {
      // 模拟网络延迟
      setTimeout(() => {
        if (endpoint.startsWith("/data")) {
          resolve(mockData as T)
        } else if (endpoint === "/upload") {
          resolve({ message: "Mock: 卡片上传成功" } as T)
        } else if (endpoint === "/move") {
          resolve({ message: "Mock: 卡片移动成功" } as T)
        } else if (endpoint === "/delete") {
          resolve({ message: "Mock: 卡片删除成功" } as T)
        } else if (endpoint === "/export") {
          const blob = new Blob(["Mock card data"], { type: "text/plain" })
          resolve(blob as T)
        } else if (endpoint === "/feed/add") {
          resolve({ message: "Mock: BIN 添加成功" } as T)
        } else if (endpoint.startsWith("/feed/delete")) {
          resolve({ message: "Mock: BIN 删除成功" } as T)
        } else {
          resolve({} as T)
        }
      }, 300) // 减少延迟到300ms
    })
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: {
          "X-API-Key": this.apiKey,
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 5000, // 5秒超时
      })

      if (response.ok) {
        this.useMockData = false
        this.connectionTested = true
        console.log("✅ 后端连接测试成功")
        return true
      }
      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      console.error("❌ 后端连接测试失败:", error)
      this.useMockData = true
      this.connectionTested = true
      return false
    }
  }

  // 获取所有数据
  async getAllData(searchQuery?: string): Promise<ApiResponse> {
    const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ""
    const data = await this.request<ApiResponse>(`/data${params}`)

    // 如果有搜索查询，过滤数据
    if (searchQuery && this.useMockData) {
      const query = searchQuery.toLowerCase()
      return {
        ...data,
        library_cards: data.library_cards.filter(
          (card) =>
            card.card_number.includes(query) ||
            card.brand.toLowerCase().includes(query) ||
            card.country_alpha2.toLowerCase().includes(query) ||
            card.issuer.toLowerCase().includes(query),
        ),
        pool_cards: data.pool_cards.filter(
          (card) =>
            card.card_number.includes(query) ||
            card.brand.toLowerCase().includes(query) ||
            card.country_alpha2.toLowerCase().includes(query) ||
            card.issuer.toLowerCase().includes(query),
        ),
      }
    }

    return data
  }

  // 上传卡片
  async uploadCards(target: "library" | "pool", cardData: string) {
    return this.request("/upload", {
      method: "POST",
      body: JSON.stringify({
        target,
        card_data: cardData,
      }),
    })
  }

  // 移动卡片到卡池
  async moveToPool(cardIds: number[]) {
    return this.request("/move", {
      method: "POST",
      body: JSON.stringify({
        card_ids: cardIds,
      }),
    })
  }

  // 删除卡片
  async deleteCards(target: "library" | "pool", cardIds: number[]) {
    return this.request("/delete", {
      method: "POST",
      body: JSON.stringify({
        target,
        card_ids: cardIds,
      }),
    })
  }

  // 导出卡片
  async exportCards(target: "library" | "pool", cardIds: number[]): Promise<Blob> {
    return this.request<Blob>("/export", {
      method: "POST",
      body: JSON.stringify({
        target,
        card_ids: cardIds,
      }),
    })
  }

  // 添加料站 BIN
  async addFeedBin(bin: string, cardRate?: number, awsRate?: number) {
    return this.request("/feed/add", {
      method: "POST",
      body: JSON.stringify({
        bin,
        card_rate: cardRate,
        aws_rate: awsRate,
      }),
    })
  }

  // 删除料站 BIN
  async deleteFeedBin(id: number) {
    return this.request(`/feed/delete/${id}`, {
      method: "POST",
    })
  }

  // 检查是否使用 mock 数据
  isUsingMockData(): boolean {
    return this.useMockData
  }

  // 获取连接状态
  getConnectionStatus(): "connected" | "disconnected" | "testing" {
    if (!this.connectionTested) return "testing"
    return this.useMockData ? "disconnected" : "connected"
  }

  // 获取当前API配置信息
  getApiInfo() {
    return {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      isConnected: !this.useMockData,
      connectionTested: this.connectionTested,
    }
  }
}

// 导出 API 客户端实例
export const apiClient = new ApiClient()

// 导出便捷方法
export const { getAllData, uploadCards, moveToPool, deleteCards, exportCards, addFeedBin, deleteFeedBin } = apiClient
