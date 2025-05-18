"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Copy, ArrowRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { DEFAULT_WEBSITES } from "@/lib/websites"

interface Website {
  id: string;
  url: string;
  name: string;
  category?: string;
}

export default function CreatePage() {
  const router = useRouter()
  const [websites, setWebsites] = useState<Website[]>(() => {
    const currentSite: Website = {
      id: "current_site_test",
      url: typeof window !== "undefined" ? window.location.origin : "", // 使用 origin 避免参数问题
      name: "本站测试 (Current Site Test)",
      category: "test",
    };
    // 确保只在客户端执行，并且 window 对象可用
    if (typeof window !== "undefined") {
      return [currentSite, ...DEFAULT_WEBSITES];
    }
    return [...DEFAULT_WEBSITES];
  })
  const [newUrl, setNewUrl] = useState("")
  const [newName, setNewName] = useState("")
  const [trackingId, setTrackingId] = useState("")
  const [showCopyAlert, setShowCopyAlert] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // 当组件加载时，如果 window.location.origin 之前未成功获取，则尝试更新
  useEffect(() => {
    if (typeof window !== "undefined" && websites.find(site => site.id === "current_site_test" && site.url === "")) {
      setWebsites(prevWebsites => 
        prevWebsites.map(site => 
          site.id === "current_site_test" 
            ? { ...site, url: window.location.origin } 
            : site
        )
      );
    }
  }, []); // 确保只运行一次

  // 添加新网站
  const addWebsite = () => {
    if (!newUrl || !newName) return

    // 简单验证URL
    let url = newUrl
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    const newWebsite = {
      id: Date.now().toString(),
      url,
      name: newName,
      category: "other",
    }

    setWebsites([...websites, newWebsite])
    setNewUrl("")
    setNewName("")
  }

  // 删除网站
  const removeWebsite = (id: string) => {
    setWebsites(websites.filter((site) => site.id !== id))
  }

  // 生成跟踪ID
  const generateTrackingId = () => {
    const id = Math.random().toString(36).substring(2, 10)
    setTrackingId(id)

    // 确保数据正确保存到localStorage
    try {
      localStorage.setItem(`health_messenger_tracking_${id}`, JSON.stringify(websites))
      console.log(`已成功保存检测ID数据: health_messenger_tracking_${id}`, websites.length)
    } catch (error) {
      console.error("保存检测ID数据失败:", error)
    }

    return id
  }

  // 复制链接
  const copyLink = () => {
    const id = trackingId || generateTrackingId()
    const link = `${window.location.origin}/detect/${id}`
    
    // 确保再次保存数据，防止ID生成后数据未保存
    try {
      localStorage.setItem(`health_messenger_tracking_${id}`, JSON.stringify(websites))
      
      // 验证数据是否成功保存
      const savedData = localStorage.getItem(`health_messenger_tracking_${id}`)
      if (savedData) {
        console.log(`验证：数据已成功保存到 health_messenger_tracking_${id}，大小为：${savedData.length} 字节`)
      } else {
        console.error(`验证：无法保存数据到 health_messenger_tracking_${id}`)
      }
    } catch (error) {
      console.error("保存检测ID数据失败:", error)
    }
    
    navigator.clipboard.writeText(link)
    setShowCopyAlert(true)
    setTimeout(() => setShowCopyAlert(false), 3000)
  }

  // 查看结果
  const viewResults = () => {
    const id = trackingId || generateTrackingId()
    
    // 确保再次保存数据，防止ID生成后数据未保存
    try {
      localStorage.setItem(`health_messenger_tracking_${id}`, JSON.stringify(websites))
    } catch (error) {
      console.error("保存检测ID数据失败:", error)
    }
    
    router.push(`/results/${id}`)
  }
} 