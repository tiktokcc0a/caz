"use client"

import { useState, useEffect } from "react"
import { apiClient, type ApiResponse } from "@/lib/api"

export function useApiData(searchQuery?: string) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 等待一小段时间，让连接测试有机会完成
      await new Promise((resolve) => setTimeout(resolve, 100))

      const result = await apiClient.getAllData(searchQuery)
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取数据失败"
      console.error("useApiData error:", errorMessage)
      setError(errorMessage)

      // 如果是连接错误，强制使用mock模式并重试
      if (errorMessage.includes("HTML instead of JSON") || errorMessage.includes("Expected JSON response")) {
        console.log("🔄 Forcing mock mode and retrying...")
        apiClient.forceMockMode()
        try {
          const result = await apiClient.getAllData(searchQuery)
          setData(result)
          setError(null)
        } catch (retryErr) {
          console.error("Retry failed:", retryErr)
          setError("无法获取数据，请检查网络连接")
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [searchQuery])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

export function useApiMutation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async <T,>(
    apiCall: () => Promise<T>,
    onSuccess?: (data: T) => void,
    onError?: (error: Error) => void,
  ) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiCall()
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error("操作失败")
      setError(error.message)
      onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    mutate,
    loading,
    error,
  }
}
