"use client"

import { useState, useEffect, useRef } from "react"
import { Settings, Database, BarChart3, Upload, Download, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export default function GlowMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems = [
    { icon: Database, label: "卡库管理", href: "#library" },
    { icon: BarChart3, label: "统计分析", href: "#stats" },
    { icon: Upload, label: "批量上传", href: "#upload" },
    { icon: Download, label: "数据导出", href: "#export" },
    { icon: Settings, label: "系统设置", href: "#settings" },
  ]

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // 防止页面滚动
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  return (
    <>
      {/* 全屏遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[999998]"
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999998,
            background: "rgba(0, 0, 0, 0.1)",
          }}
        />
      )}

      <div className="relative z-[99999]" ref={menuRef}>
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative group p-2.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border border-gray-300/50 hover:border-yellow-400/50 dark:border-white/10 dark:hover:border-white/20 transition-all duration-300"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            <div className="relative transition-transform duration-300 group-hover:scale-110">
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
