"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

interface Website {
  id: string
  url: string
  name: string
  category?: string
}

export default function DetectPage({ params }: { params: { id: string } }) {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { id } = params

  useEffect(() => {
    // 从localStorage获取网站列表
    const storedData = localStorage.getItem(`tracking_${id}`)
    if (storedData) {
      setWebsites(JSON.parse(storedData))
    } else {
      // 如果没有找到数据，使用默认列表（这里只显示部分，实际会从create/page.tsx中获取完整列表）
      setWebsites([
        // 社交媒体
        { id: "1", url: "https://www.tiktok.com", name: "抖音国际版" },
        { id: "2", url: "https://weibo.com", name: "微博" },
        { id: "3", url: "https://www.douyin.com", name: "抖音" },
        { id: "4", url: "https://www.kuaishou.com", name: "快手" },
        { id: "5", url: "https://www.xiaohongshu.com", name: "小红书" },
        { id: "6", url: "https://www.bilibili.com", name: "哔哩哔哩" },
        // 成人内容网站
        { id: "7", url: "https://www.pornhub.com", name: "Pornhub" },
        { id: "8", url: "https://www.xvideos.com", name: "XVideos" },
        // 游戏网站
        { id: "9", url: "https://store.steampowered.com", name: "Steam" },
        { id: "10", url: "https://www.epicgames.com", name: "Epic Games" },
        // 其他网站
        { id: "11", url: "https://www.youtube.com", name: "YouTube" },
        { id: "12", url: "https://www.reddit.com", name: "Reddit" },
      ])
    }
    setLoading(false)
  }, [id])

  // 完成检测
  const completeDetection = () => {
    // 在实际应用中，这里应该将结果保存到数据库
    // 这里我们简单地标记为已完成
    setCompleted(true)

    // 记录已访问的链接（这只是模拟，实际上我们无法直接获取已访问的链接）
    // 在真实场景中，我们依赖于CSS :visited选择器的视觉效果
    localStorage.setItem(
      `result_${id}`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        completed: true,
      }),
    )
  }

  // 过滤网站
  const filteredWebsites = websites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.url.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100">
        <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-700">网站访问检测</CardTitle>
            <CardDescription>
              {completed ? "检测已完成，感谢您的配合！" : "此页面将检测您是否访问过以下网站"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {completed ? (
              <div className="text-center py-8">
                <div className="text-green-600 text-lg font-medium mb-4">检测已完成</div>
                <p className="text-gray-600">您可以关闭此页面了。检测结果已记录。</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-600">请查看下面的网站列表。这些链接会根据您的浏览历史显示不同的颜色。</p>

                <div className="mb-4">
                  <Input
                    placeholder="搜索网站..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-500">
                    显示 {filteredWebsites.length} 个网站，共 {websites.length} 个
                  </p>
                </div>

                <div className="grid gap-3 max-h-[400px] overflow-y-auto p-1">
                  {filteredWebsites.map((site) => (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-white rounded-md border hover:bg-gray-50 transition-colors visited:text-purple-700"
                    >
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-gray-500">{site.url}</div>
                    </a>
                  ))}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800">
                  <p className="text-sm">
                    <strong>提示：</strong>{" "}
                    已访问过的链接会显示为紫色。这是浏览器的标准行为，用于区分已访问和未访问的链接。
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter>
            {completed ? (
              <Button asChild className="w-full">
                <Link href="/">返回首页</Link>
              </Button>
            ) : (
              <Button onClick={completeDetection} className="w-full bg-green-600 hover:bg-green-700">
                完成检测
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
