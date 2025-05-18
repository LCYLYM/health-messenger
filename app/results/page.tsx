"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, CalendarIcon, TrashIcon, PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"

// 检测会话数据结构
interface DetectionSessionData {
  sessionId: string
  timestamp: string
  completed: boolean
  websites: Array<{
    id: string
    url: string
    name: string
    category?: string
    visited?: boolean
  }>
}

export default function ResultsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<DetectionSessionData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchId, setSearchId] = useState("")
  const [error, setError] = useState<string | null>(null)

  // 加载所有会话数据
  useEffect(() => {
    const loadAllSessions = async () => {
      try {
        // 首先尝试从服务器加载数据
        try {
          const response = await fetch('/api/sessions');

          if (response.ok) {
            const serverSessions = await response.json();
            console.log('成功从服务器加载会话数据:', serverSessions.length);

            // 转换为应用中使用的格式
            const formattedSessions: DetectionSessionData[] = serverSessions.map((session: any) => ({
              sessionId: session.id,
              timestamp: session.createdAt,
              completed: session.completed,
              websites: session.websites
            }));

            // 按时间倒序排序
            formattedSessions.sort((a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            setSessions(formattedSessions);
            setLoading(false);
            return;
          }
        } catch (serverError) {
          console.error("从服务器加载数据失败，尝试从本地缓存加载:", serverError);
        }

        // 如果服务器加载失败，尝试从本地缓存加载
        const allSessions: DetectionSessionData[] = [];

        // 检查localStorage中的所有键
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);

          // 找到所有检测会话数据
          if (key && key.startsWith('health_messenger_detection_session_')) {
            try {
              const sessionDataStr = localStorage.getItem(key);
              if (sessionDataStr) {
                const sessionData = JSON.parse(sessionDataStr) as DetectionSessionData;
                allSessions.push(sessionData);
              }
            } catch (e) {
              console.error(`解析会话数据失败: ${key}`, e);
            }
          }
        }

        // 按时间倒序排序
        allSessions.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setSessions(allSessions);
      } catch (error) {
        console.error("加载检测会话数据失败:", error);
        setError("加载会话数据失败");
      }

      setLoading(false);
    };

    loadAllSessions();
  }, []);

  // 过滤会话
  const filteredSessions = sessions.filter(session => {
    if (!searchTerm) return true
    return (
      session.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      new Date(session.timestamp).toLocaleString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.websites.some(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.url.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  })

  // 直接跳转到指定ID的结果页面
  const goToResults = () => {
    if (searchId.trim()) {
      router.push(`/results/${searchId.trim()}`)
    }
  }

  // 删除会话
  const deleteSession = async (sessionId: string) => {
    if (confirm(`确定要删除检测会话 ${sessionId} 吗？`)) {
      try {
        // 首先尝试从服务器删除
        try {
          const response = await fetch(`/api/sessions?id=${sessionId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            console.log(`成功从服务器删除会话: ${sessionId}`);
          } else {
            console.error(`从服务器删除会话失败: ${sessionId}`);
          }
        } catch (serverError) {
          console.error("从服务器删除会话失败:", serverError);
        }

        // 同时从本地缓存删除
        // 删除新格式会话数据
        localStorage.removeItem(`health_messenger_detection_session_${sessionId}`);

        // 删除旧格式数据(向后兼容)
        localStorage.removeItem(`tracking_${sessionId}`);
        localStorage.removeItem(`websites_${sessionId}`);
        localStorage.removeItem(`result_${sessionId}`);

        // 更新会话列表
        setSessions(sessions.filter(s => s.sessionId !== sessionId));
      } catch (error) {
        console.error("删除会话失败:", error);
        setError("删除会话失败");
      }
    }
  }

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

        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-700">检测结果管理</CardTitle>
            <CardDescription>
              查看和管理您创建的所有检测会话
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="搜索会话..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="bg-green-600 hover:bg-green-700 text-white hover:text-white"
                    asChild
                  >
                    <Link href="/create">
                      <PlusCircle className="h-4 w-4 mr-2" /> 创建新检测
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="border p-3 rounded-md flex items-center space-x-3 bg-gray-50">
                <Input
                  placeholder="输入检测ID查看结果..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={goToResults} disabled={!searchId.trim()}>
                  <ArrowRight className="h-4 w-4 mr-2" /> 查看
                </Button>
              </div>
            </div>

            {error && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">您还没有创建任何检测会话</p>
                <Button asChild className="bg-green-600 hover:bg-green-700">
                  <Link href="/create">创建第一个检测</Link>
                </Button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium mb-3">您的检测会话 ({filteredSessions.length})</h3>
                <div className="grid gap-4 max-h-[500px] overflow-y-auto">
                  {filteredSessions.map((session) => (
                    <div key={session.sessionId} className="bg-white p-4 rounded-md border hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            检测ID: {session.sessionId}
                            {session.completed && <Badge className="bg-green-600">已完成</Badge>}
                            {!session.completed && <Badge className="bg-yellow-500">进行中</Badge>}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center mt-1">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(session.timestamp).toLocaleString()}
                          </div>
                          <div className="text-sm mt-2">
                            <span className="text-gray-600">检测网站: {session.websites.length}个</span>
                            {session.completed && (
                              <span className="ml-3 text-green-600">
                                已访问: {session.websites.filter(site => site.visited).length}个
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteSession(session.sessionId)}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-gray-700"
                            asChild
                          >
                            <Link href={`/results/${session.sessionId}`}>
                              <ArrowRight className="h-5 w-5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredSessions.length === 0 && searchTerm && (
                    <div className="text-center py-6 text-gray-500">
                      没有找到匹配的检测会话
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <div className="w-full text-center text-sm text-gray-500">
              检测数据存储在服务器和浏览器本地缓存中，可在不同浏览器间共享。
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
