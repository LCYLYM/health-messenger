"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ExternalLink, Copy, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"

interface Website {
  id: string
  url: string
  name: string
  category?: string
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [showCopyAlert, setShowCopyAlert] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { id } = params

  useEffect(() => {
    // 从localStorage获取网站列表和结果
    const storedData = localStorage.getItem(`tracking_${id}`)
    const resultData = localStorage.getItem(`result_${id}`)

    if (storedData) {
      setWebsites(JSON.parse(storedData))
    } else {
      // 如果没有找到数据，使用默认列表（这里只显示部分，实际会从create/page.tsx中获取完整列表）
      setWebsites([
        // 社交媒体
        { id: "1", url: "https://www.tiktok.com", name: "抖音国际版" },
        { id: "2", url: "https://weibo.com", name: "微博" },
        { id: "3", name: "抖音国际版" },
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

    if (resultData) {
      setCompleted(JSON.parse(resultData).completed)
    }

    setLoading(false)
  }, [id])

  // 复制检测链接
  const copyDetectionLink = () => {
    const link = `${window.location.origin}/detect/${id}`
    navigator.clipboard.writeText(link)
    setShowCopyAlert(true)
    setTimeout(() => setShowCopyAlert(false), 3000)
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
        <Link href="/" className="text-green-700 hover:text-green-900 mb-8 inline-block">
          ← 返回首页
        </Link>

        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-700">检测结果</CardTitle>
            <CardDescription>
              检测ID: {id} {completed && <span className="text-green-600">(已完成)</span>}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!completed ? (
              <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                <AlertDescription>检测尚未完成。请等待被检测者完成检测后再查看结果。</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  检测已完成。请注意，此检测方法基于CSS的:visited选择器，只能在被检测者的浏览器上直接观察结果。
                  在结果页面上，我们无法直接获取哪些链接被访问过，但被检测者可以看到已访问的链接会显示为紫色。
                </p>

                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
                  <p className="font-medium mb-2">如何查看结果？</p>
                  <p className="text-sm">要查看结果，您需要：</p>
                  <ol className="text-sm list-decimal ml-5 mt-2 space-y-1">
                    <li>与被检测者在同一设备上查看</li>
                    <li>已访问过的链接会显示为紫色</li>
                    <li>未访问过的链接会保持原来的颜色</li>
                  </ol>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium mb-3">检测的网站列表</h3>
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
                  <div key={site.id} className="flex items-center justify-between p-3 bg-white rounded-md border">
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-gray-500">{site.url}</p>
                    </div>
                    <Button variant="ghost" size="icon" asChild className="text-gray-500 hover:text-gray-700">
                      <a href={site.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={copyDetectionLink} className="flex-1 bg-green-600 hover:bg-green-700">
                <Copy className="h-5 w-5 mr-2" /> 复制检测链接
              </Button>
              <Button asChild variant="outline" className="flex-1 border-green-600 text-green-700 hover:bg-green-50">
                <Link href={`/detect/${id}`}>
                  <RefreshCw className="h-5 w-5 mr-2" /> 重新检测
                </Link>
              </Button>
            </div>

            {showCopyAlert && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>检测链接已复制到剪贴板！您可以将其分享给需要检测的人。</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
