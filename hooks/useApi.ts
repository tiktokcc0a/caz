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
      const result = await apiClient.getAllData(searchQuery)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取数据失败")
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
