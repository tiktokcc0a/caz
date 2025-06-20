"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search, Upload, Trash2, Download, Move, Plus, AlertCircle, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import GlowMenu from "@/components/glow-menu"
import { useApiData, useApiMutation } from "@/hooks/useApi"
import { apiClient } from "@/lib/api"

const getCountryFlag = (countryCode: string) => {
  const flags: { [key: string]: string } = {
    US: "🇺🇸",
    CA: "🇨🇦",
    UK: "🇬🇧",
    DE: "🇩🇪",
    FR: "🇫🇷",
    JP: "🇯🇵",
    AU: "🇦🇺",
  }
  return flags[countryCode] || "🏳️"
}

const getRating = (rate: number) => {
  if (rate >= 90) return ["Awesome", "rating-awesome"]
  if (rate >= 80) return ["Excellent", "rating-excellent"]
  if (rate >= 70) return ["Normal", "rating-normal"]
  if (rate >= 60) return ["So-so", "rating-so-so"]
  if (rate >= 50) return ["Loss", "rating-loss"]
  return ["Trash", "rating-trash"]
}

export default function CardzManagement() {
  const [selectedLibraryCards, setSelectedLibraryCards] = useState<number[]>([])
  const [selectedPoolCards, setSelectedPoolCards] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [uploadTarget, setUploadTarget] = useState("library")
  const [cardData, setCardData] = useState("")
  const [newBin, setNewBin] = useState("")
  const [newCardRate, setNewCardRate] = useState("")
  const [newAwsRate, setNewAwsRate] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<"testing" | "connected" | "disconnected">("testing")

  const { toast } = useToast()
  const { data, loading, error, refetch } = useApiData(searchQuery)
  const { mutate, loading: mutating } = useApiMutation()

  // 测试后端连接
  useEffect(() => {
    const testConnection = async () => {
      const isConnected = await apiClient.testConnection()
      setConnectionStatus(isConnected ? "connected" : "disconnected")

      if (isConnected) {
        toast({
          title: "✅ 后端连接成功",
          description: "已成功连接到后端服务器",
        })
      } else {
        const apiInfo = apiClient.getApiInfo()
        toast({
          title: "❌ 后端连接失败",
          description: `无法连接到: ${apiInfo.baseUrl}`,
          variant: "destructive",
        })
      }
    }

    testConnection()
  }, [toast])

  const handleLibraryCardSelect = (cardId: number, checked: boolean) => {
    if (checked) {
      setSelectedLibraryCards([...selectedLibraryCards, cardId])
    } else {
      setSelectedLibraryCards(selectedLibraryCards.filter((id) => id !== cardId))
    }
  }

  const handlePoolCardSelect = (cardId: number, checked: boolean) => {
    if (checked) {
      setSelectedPoolCards([...selectedPoolCards, cardId])
    } else {
      setSelectedPoolCards(selectedPoolCards.filter((id) => id !== cardId))
    }
  }

  const toggleAllLibrary = (checked: boolean) => {
    if (checked && data) {
      setSelectedLibraryCards(data.library_cards.map((card) => card.id))
    } else {
      setSelectedLibraryCards([])
    }
  }

  const toggleAllPool = (checked: boolean) => {
    if (checked && data) {
      setSelectedPoolCards(data.pool_cards.map((card) => card.id))
    } else {
      setSelectedPoolCards([])
    }
  }

  // 文件上传处理
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setCardData(content)
      }
      reader.readAsText(file)
    }
  }

  const handleUpload = async () => {
    if (!cardData.trim()) {
      toast({
        title: "错误",
        description: "请输入卡片数据或上传文件",
        variant: "destructive",
      })
      return
    }

    await mutate(
      () => apiClient.uploadCards(uploadTarget as "library" | "pool", cardData),
      (result: any) => {
        toast({
          title: "成功",
          description: result.message,
        })
        setCardData("")
        refetch()
      },
      (error) => {
        toast({
          title: "上传失败",
          description: error.message,
          variant: "destructive",
        })
      },
    )
  }

  const handleMoveToPool = async () => {
    if (selectedLibraryCards.length === 0) {
      toast({
        title: "错误",
        description: "请选择要移动的卡片",
        variant: "destructive",
      })
      return
    }

    await mutate(
      () => apiClient.moveToPool(selectedLibraryCards),
      (result: any) => {
        toast({
          title: "成功",
          description: result.message,
        })
        setSelectedLibraryCards([])
        refetch()
      },
      (error) => {
        toast({
          title: "移动失败",
          description: error.message,
          variant: "destructive",
        })
      },
    )
  }

  const handleDeleteCards = async (target: "library" | "pool") => {
    const selectedCards = target === "library" ? selectedLibraryCards : selectedPoolCards
    if (selectedCards.length === 0) {
      toast({
        title: "错误",
        description: "请选择要删除的卡片",
        variant: "destructive",
      })
      return
    }

    await mutate(
      () => apiClient.deleteCards(target, selectedCards),
      (result: any) => {
        toast({
          title: "成功",
          description: result.message,
        })
        if (target === "library") {
          setSelectedLibraryCards([])
        } else {
          setSelectedPoolCards([])
        }
        refetch()
      },
      (error) => {
        toast({
          title: "删除失败",
          description: error.message,
          variant: "destructive",
        })
      },
    )
  }

  const handleExportCards = async (target: "library" | "pool") => {
    const selectedCards = target === "library" ? selectedLibraryCards : selectedPoolCards
    if (selectedCards.length === 0) {
      toast({
        title: "错误",
        description: "请选择要导出的卡片",
        variant: "destructive",
      })
      return
    }

    await mutate(
      () => apiClient.exportCards(target, selectedCards),
      (blob: Blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "cards.txt"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast({
          title: "成功",
          description: "卡片已导出",
        })
      },
      (error) => {
        toast({
          title: "导出失败",
          description: error.message,
          variant: "destructive",
        })
      },
    )
  }

  const handleAddFeedBin = async () => {
    if (!newBin || newBin.length !== 6) {
      toast({
        title: "错误",
        description: "请输入有效的6位BIN",
        variant: "destructive",
      })
      return
    }

    await mutate(
      () =>
        apiClient.addFeedBin(
          newBin,
          newCardRate ? Number.parseInt(newCardRate) : undefined,
          newAwsRate ? Number.parseInt(newAwsRate) : undefined,
        ),
      (result: any) => {
        toast({
          title: "成功",
          description: result.message,
        })
        setNewBin("")
        setNewCardRate("")
        setNewAwsRate("")
        refetch()
      },
      (error) => {
        toast({
          title: "添加失败",
          description: error.message,
          variant: "destructive",
        })
      },
    )
  }

  const handleDeleteFeedBin = async (id: number) => {
    await mutate(
      () => apiClient.deleteFeedBin(id),
      (result: any) => {
        toast({
          title: "成功",
          description: result.message,
        })
        refetch()
      },
      (error) => {
        toast({
          title: "删除失败",
          description: error.message,
          variant: "destructive",
        })
      },
    )
  }

  // 重新测试连接
  const handleRetryConnection = async () => {
    setConnectionStatus("testing")
    const isConnected = await apiClient.testConnection()
    setConnectionStatus(isConnected ? "connected" : "disconnected")

    if (isConnected) {
      toast({
        title: "✅ 连接成功",
        description: "已成功连接到后端服务器",
      })
      refetch() // 重新获取数据
    } else {
      toast({
        title: "❌ 连接失败",
        description: "仍无法连接到后端服务器",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-800">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">加载失败: {error}</p>
          <Button onClick={refetch} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen theme-transition bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-800">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse theme-transition"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000 theme-transition"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 dark:bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500 theme-transition"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl theme-bg-header theme-transition">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-gray-600 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                Cardz 卡片管理系统
              </h1>

              {/* 连接状态指示器 */}
              <div className="flex items-center gap-2">
                {connectionStatus === "connected" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                    <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-700 dark:text-green-300">已连接</span>
                  </div>
                )}
                {connectionStatus === "disconnected" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 rounded-full">
                    <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs text-red-700 dark:text-red-300">未连接</span>
                  </div>
                )}
                {connectionStatus === "testing" && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                    <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-yellow-700 dark:text-yellow-300">测试中</span>
                  </div>
                )}
              </div>
            </div>
            <GlowMenu />
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-8 space-y-8">
        {/* 连接状态警告 - 只在未连接时显示 */}
        {connectionStatus === "disconnected" && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200 flex items-center justify-between">
              <div>
                <strong>后端连接失败:</strong> 无法连接到后端服务器 ({apiClient.getApiInfo().baseUrl}
                )，当前使用模拟数据进行演示。
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetryConnection}
                className="ml-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                重试连接
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Section */}
        <Card className="backdrop-blur-xl theme-bg-card shadow-2xl theme-transition">
          <CardHeader>
            <CardTitle className="theme-text-primary flex items-center gap-2">
              <Upload className="w-5 h-5" />
              上传卡片
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="theme-text-secondary text-sm font-medium">上传至:</label>
              <Select value={uploadTarget} onValueChange={setUploadTarget}>
                <SelectTrigger className="theme-bg-input theme-transition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 dark:bg-gray-900 dark:border-white/20">
                  <SelectItem value="library">卡库 (未使用)</SelectItem>
                  <SelectItem value="pool">卡池 (已使用)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 文件上传 */}
            <div className="space-y-2">
              <label className="theme-text-secondary text-sm font-medium">上传文件:</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  className="theme-bg-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900 dark:file:text-purple-300"
                />
                <span className="theme-text-muted text-sm">支持 .txt, .csv 格式</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="theme-text-secondary text-sm font-medium">或粘贴卡片数据 (一行一张):</label>
              <Textarea
                value={cardData}
                onChange={(e) => setCardData(e.target.value)}
                placeholder="卡号|月份/年份|CVV..."
                className="theme-bg-input min-h-[120px] theme-transition"
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={mutating}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg theme-transition"
            >
              {mutating ? "上传中..." : "开始上传"}
            </Button>
          </CardContent>
        </Card>

        {/* Feed Station */}
        <Card className="backdrop-blur-xl theme-bg-card shadow-2xl theme-transition">
          <CardHeader>
            <CardTitle className="theme-text-primary">料站 - cczauvr.sale/Other 高活率BIN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <label className="theme-text-secondary text-sm font-medium">BIN (6位数字)</label>
                <Input
                  value={newBin}
                  onChange={(e) => setNewBin(e.target.value)}
                  placeholder="BIN"
                  maxLength={6}
                  className="theme-bg-input theme-transition"
                />
              </div>
              <div className="space-y-2">
                <label className="theme-text-secondary text-sm font-medium">卡片活率</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={newCardRate}
                    onChange={(e) => setNewCardRate(e.target.value)}
                    placeholder="0-100"
                    min="0"
                    max="100"
                    className="theme-bg-input pr-8 theme-transition"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 theme-text-muted">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="theme-text-secondary text-sm font-medium">AWS活率</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={newAwsRate}
                    onChange={(e) => setNewAwsRate(e.target.value)}
                    placeholder="0-100"
                    min="0"
                    max="100"
                    className="theme-bg-input pr-8 theme-transition"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 theme-text-muted">%</span>
                </div>
              </div>
              <Button
                onClick={handleAddFeedBin}
                disabled={mutating}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white theme-transition"
              >
                <Plus className="w-4 h-4 mr-2" />
                {mutating ? "添加中..." : "添加/更新"}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b theme-table-border">
                    <th className="text-left py-3 px-4 theme-text-secondary font-medium">BIN</th>
                    <th className="text-left py-3 px-4 theme-text-secondary font-medium">卡片活率</th>
                    <th className="text-left py-3 px-4 theme-text-secondary font-medium">AWS活率</th>
                    <th className="text-left py-3 px-4 theme-text-secondary font-medium">最后修改日期</th>
                    <th className="text-left py-3 px-4 theme-text-secondary font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.feed_bins.map((bin) => (
                    <tr key={bin.id} className="border-b theme-table-border theme-table-hover theme-transition">
                      <td className="py-3 px-4 theme-text-primary font-mono font-bold">{bin.bin}</td>
                      <td className="py-3 px-4 theme-text-primary">
                        {bin.card_rate !== null ? `${bin.card_rate}%` : "N/A"}
                        {bin.card_rate !== null && (
                          <span
                            className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${getRating(bin.card_rate)[1]}`}
                          >
                            {getRating(bin.card_rate)[0]}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 theme-text-primary">
                        {bin.aws_rate !== null ? `${bin.aws_rate}%` : "N/A"}
                        {bin.aws_rate !== null && (
                          <span
                            className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${getRating(bin.aws_rate)[1]}`}
                          >
                            {getRating(bin.aws_rate)[0]}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 theme-text-secondary">{bin.last_modified}</td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteFeedBin(bin.id)}
                          disabled={mutating}
                          className="bg-red-600/80 hover:bg-red-700 theme-transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className="backdrop-blur-xl theme-bg-card shadow-2xl theme-transition">
          <CardHeader>
            <CardTitle className="theme-text-primary">卡片库存统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data &&
                Object.entries(data.stats).map(([country, stats]) => (
                  <div key={country} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getCountryFlag(country)}</span>
                      <span className="theme-text-primary font-bold text-lg">
                        {country} (总计: {stats.total} 张)
                      </span>
                    </div>
                    <ul className="space-y-1 pl-4">
                      {Object.entries(stats.bins).map(([bin, count]) => (
                        <li key={bin} className="theme-text-secondary text-sm">
                          <span className="font-mono">{bin}</span>: {count} 张
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="backdrop-blur-xl theme-bg-card shadow-2xl theme-transition">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 theme-text-muted w-5 h-5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="在卡库和卡池中搜索 (卡号, 国家, 品牌, 类型, 发卡行等)..."
                  className="theme-bg-input pl-10 theme-transition"
                />
              </div>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10 theme-transition"
                >
                  清除搜索
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Library Cards */}
          <Card className="backdrop-blur-xl theme-bg-card shadow-2xl theme-transition">
            <CardHeader>
              <CardTitle className="theme-text-primary">
                卡库 (未使用) - 共 {data?.library_cards.length || 0} 张
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleMoveToPool}
                  disabled={selectedLibraryCards.length === 0 || mutating}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 theme-transition"
                >
                  <Move className="w-4 h-4 mr-2" />
                  移动选中到卡池
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteCards("library")}
                  disabled={selectedLibraryCards.length === 0 || mutating}
                  className="bg-red-600/80 hover:bg-red-700 theme-transition"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除选中
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCards("library")}
                  disabled={selectedLibraryCards.length === 0 || mutating}
                  className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10 theme-transition"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出选中
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b theme-table-border">
                      <th className="text-left py-3 px-2">
                        <Checkbox
                          checked={
                            data &&
                            selectedLibraryCards.length === data.library_cards.length &&
                            data.library_cards.length > 0
                          }
                          onCheckedChange={toggleAllLibrary}
                        />
                      </th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">卡号 / BIN</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">国家</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">有效期</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">CVV</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">品牌</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">发卡行 / 类型</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.library_cards.map((card) => (
                      <tr key={card.id} className="border-b theme-table-border theme-table-hover theme-transition">
                        <td className="py-3 px-2">
                          <Checkbox
                            checked={selectedLibraryCards.includes(card.id)}
                            onCheckedChange={(checked) => handleLibraryCardSelect(card.id, checked as boolean)}
                          />
                        </td>
                        <td className="py-3 px-4 theme-text-primary font-mono">
                          {card.card_number.slice(0, 6)}...{card.card_number.slice(-4)}
                        </td>
                        <td className="py-3 px-4 theme-text-primary flex items-center gap-2">
                          <span className="text-lg">{getCountryFlag(card.country_alpha2)}</span>
                          {card.country_alpha2}
                        </td>
                        <td className="py-3 px-4 theme-text-primary">
                          {card.month}/{card.year}
                        </td>
                        <td className="py-3 px-4 theme-text-primary font-mono">{card.cvv}</td>
                        <td className="py-3 px-4 theme-text-primary">{card.brand || "N/A"}</td>
                        <td className="py-3 px-4 theme-text-primary">
                          <div>{card.issuer || "N/A"}</div>
                          <div className="text-sm theme-text-muted">
                            {card.type || "N/A"} / {card.category || "N/A"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pool Cards */}
          <Card className="backdrop-blur-xl theme-bg-card shadow-2xl theme-transition">
            <CardHeader>
              <CardTitle className="theme-text-primary">卡池 (已使用) - 共 {data?.pool_cards.length || 0} 张</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteCards("pool")}
                  disabled={selectedPoolCards.length === 0 || mutating}
                  className="bg-red-600/80 hover:bg-red-700 theme-transition"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除选中
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCards("pool")}
                  disabled={selectedPoolCards.length === 0 || mutating}
                  className="bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10 theme-transition"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出选中
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b theme-table-border">
                      <th className="text-left py-3 px-2">
                        <Checkbox
                          checked={
                            data && selectedPoolCards.length === data.pool_cards.length && data.pool_cards.length > 0
                          }
                          onCheckedChange={toggleAllPool}
                        />
                      </th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">卡号 / BIN</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">国家</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">有效期</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">CVV</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">品牌</th>
                      <th className="text-left py-3 px-4 theme-text-secondary font-medium">发卡行 / 类型</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pool_cards.map((card) => (
                      <tr key={card.id} className="border-b theme-table-border theme-table-hover theme-transition">
                        <td className="py-3 px-2">
                          <Checkbox
                            checked={selectedPoolCards.includes(card.id)}
                            onCheckedChange={(checked) => handlePoolCardSelect(card.id, checked as boolean)}
                          />
                        </td>
                        <td className="py-3 px-4 theme-text-primary font-mono">
                          {card.card_number.slice(0, 6)}...{card.card_number.slice(-4)}
                        </td>
                        <td className="py-3 px-4 theme-text-primary flex items-center gap-2">
                          <span className="text-lg">{getCountryFlag(card.country_alpha2)}</span>
                          {card.country_alpha2}
                        </td>
                        <td className="py-3 px-4 theme-text-primary">
                          {card.month}/{card.year}
                        </td>
                        <td className="py-3 px-4 theme-text-primary font-mono">{card.cvv}</td>
                        <td className="py-3 px-4 theme-text-primary">{card.brand || "N/A"}</td>
                        <td className="py-3 px-4 theme-text-primary">
                          <div>{card.issuer || "N/A"}</div>
                          <div className="text-sm theme-text-muted">
                            {card.type || "N/A"} / {card.category || "N/A"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
