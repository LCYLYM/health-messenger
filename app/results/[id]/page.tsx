"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ExternalLink, Copy, RefreshCw, PlusCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VisitedResult } from "@/lib/utils"

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
  visitedSVGFilter?: boolean
  visitedRenderTiming?: boolean
  visitedByteCode?: boolean
  checking?: boolean // 添加checking属性，用于跟踪检测状态
}

// 检测会话数据结构，用于在localStorage中存储
interface DetectionSessionData {
  sessionId: string
  timestamp: string
  completed: boolean
  websites: Website[]
}

// 旧版results数据结构(为了兼容性保留)
interface DetectionResultData {
  timestamp: string
  completed: boolean
  results: Array<{
    url: string
    visited: boolean
    method: "css" | "requestAnimationFrame" | "css3dTransform" | "svgFill" | "svgFilter" | "renderTiming" | "byteCode" | "bytecodeCache"
  }>
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionData, setSessionData] = useState<DetectionSessionData | null>(null)
  const [showCopyAlert, setShowCopyAlert] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<string>("all")

  // 正确使用React.use()解包params
  const resolvedParams = use(params as any) as { id: string };
  const id = resolvedParams.id;

  useEffect(() => {
    // 从服务器和localStorage获取网站列表和结果
    const loadResultData = async () => {
      try {
        // 首先尝试从服务器加载数据
        try {
          const response = await fetch(`/api/sessions?id=${id}`);

          if (response.ok) {
            const serverData = await response.json();
            console.log(`成功从服务器加载会话数据: ${id}`, serverData.websites.length);

            // 转换为应用中使用的格式
            const sessionData: DetectionSessionData = {
              sessionId: id,
              timestamp: serverData.createdAt,
              completed: serverData.completed,
              websites: serverData.websites
            };

            setSessionData(sessionData);
            setWebsites(serverData.websites);
            setLoading(false);
            return;
          }
        } catch (serverError) {
          console.error("从服务器加载数据失败，尝试从本地缓存加载:", serverError);
        }

        // 如果服务器加载失败，尝试从本地缓存加载
        // 优先尝试加载新格式会话数据
        const storedSessionData = localStorage.getItem(`health_messenger_detection_session_${id}`);

        if (storedSessionData) {
          const parsedSessionData = JSON.parse(storedSessionData) as DetectionSessionData;
          console.log(`成功从本地缓存加载会话数据: ${id}`, parsedSessionData.websites.length);

          // 直接更新两个状态
          setSessionData(parsedSessionData);
          setWebsites(parsedSessionData.websites);
        }
        // 回退到旧格式兼容模式
        else {
          // 尝试多种方式获取数据
          const websitesWithResults = localStorage.getItem(`websites_${id}`);
          const storedData = localStorage.getItem(`tracking_${id}`);
          const resultData = localStorage.getItem(`result_${id}`);

          let parsedWebsites: Website[] = [];

          // 优先使用带检测结果的网站数据
          if (websitesWithResults) {
            console.log(`从websites_${id}加载数据成功`);
            parsedWebsites = JSON.parse(websitesWithResults);
            setWebsites(parsedWebsites);
          }
          // 其次使用跟踪ID保存的原始网站列表
          else if (storedData) {
            console.log(`从tracking_${id}加载数据成功`);
            parsedWebsites = JSON.parse(storedData);
            setWebsites(parsedWebsites);
          } else {
            console.error(`未找到websites_${id}或tracking_${id}数据`);
            setWebsites([]);
          }

          // 加载检测结果
          if (resultData) {
            console.log(`从result_${id}加载结果成功`);
            const parsedResults = JSON.parse(resultData) as DetectionResultData;

            // 创建兼容的sessionData
            const compatSessionData: DetectionSessionData = {
              sessionId: id,
              timestamp: parsedResults.timestamp,
              completed: parsedResults.completed,
              websites: parsedWebsites
            };

            setSessionData(compatSessionData);

            // 如果没有带结果的网站数据，则从结果合并到网站数据
            if (!websitesWithResults && parsedWebsites.length > 0 && parsedResults.results && parsedResults.results.length > 0) {
              // 从结果更新网站访问状态
              const visitedUrls = new Map<string, { method: string, visited: boolean }[]>();

              parsedResults.results.forEach(result => {
                if (!visitedUrls.has(result.url)) {
                  visitedUrls.set(result.url, []);
                }
                visitedUrls.get(result.url)?.push({
                  method: result.method,
                  visited: result.visited
                });
              });

              // 更新网站访问状态
              const updatedWebsites = parsedWebsites.map(site => {
                const siteResults = visitedUrls.get(site.url) || [];
                const updateSite = {...site};

                updateSite.visitedRAF = siteResults.some(r => r.method === 'requestAnimationFrame' && r.visited);
                updateSite.visitedCSS = siteResults.some(r => r.method === 'css' && r.visited);
                updateSite.visitedCSS3D = siteResults.some(r => r.method === 'css3dTransform' && r.visited);
                updateSite.visitedSVG = siteResults.some(r => r.method === 'svgFill' && r.visited);
                updateSite.visitedSVGFilter = siteResults.some(r => r.method === 'svgFilter' && r.visited);
                updateSite.visitedRenderTiming = siteResults.some(r => r.method === 'renderTiming' && r.visited);
                updateSite.visitedByteCode = siteResults.some(r => (r.method === 'byteCode' || r.method === 'bytecodeCache') && r.visited);

                // 至少一种检测方法为true则综合状态为true
                updateSite.visited = updateSite.visitedRAF ||
                                    updateSite.visitedCSS ||
                                    updateSite.visitedCSS3D ||
                                    updateSite.visitedSVG ||
                                    updateSite.visitedSVGFilter ||
                                    updateSite.visitedRenderTiming ||
                                    updateSite.visitedByteCode;

                return updateSite;
              });

              setWebsites(updatedWebsites);

              // 更新session数据中的websites
              compatSessionData.websites = updatedWebsites;
              setSessionData(compatSessionData);
            }
          } else {
            console.error(`未找到result_${id}数据`);
            // 创建默认的session数据
            setSessionData({
              sessionId: id,
              timestamp: new Date().toISOString(),
              completed: false,
              websites: parsedWebsites
            });
          }
        }
      } catch (error) {
        console.error("加载结果数据失败:", error);
      }

      setLoading(false);
    };

    // 初始加载数据
    loadResultData();

    // 设置定时器，更频繁地刷新数据，实现更实时的更新
    // 前30秒每1秒刷新一次，之后每2秒刷新一次
    let refreshCount = 0;
    const refreshInterval = setInterval(() => {
      // 只有在检测未完成时才需要刷新数据
      if (sessionData && !sessionData.completed) {
        loadResultData();
        refreshCount++;

        // 动态调整刷新间隔
        if (refreshCount === 30) {
          // 30秒后清除当前定时器，创建新的低频率定时器
          clearInterval(refreshInterval);
          setInterval(() => {
            if (sessionData && !sessionData.completed) {
              loadResultData();
            }
          }, 2000);
        }
      }
    }, 1000);

    // 组件卸载时清除定时器
    return () => clearInterval(refreshInterval);
  }, [id, sessionData?.completed]);

  // 复制检测链接
  const copyDetectionLink = () => {
    const link = `${window.location.origin}/detect/${id}`
    navigator.clipboard.writeText(link)
    setShowCopyAlert(true)
    setTimeout(() => setShowCopyAlert(false), 3000)
  }

  // 创建新的检测会话
  const createNewDetection = async () => {
    // 只复制网站列表，重置所有检测状态
    if (websites.length > 0) {
      const newWebsites = websites.map(site => ({
        ...site,
        visited: false,
        visitedCSS: false,
        visitedRAF: false,
        visitedCSS3D: false,
        visitedSVG: false,
        visitedSVGFilter: false,
        visitedRenderTiming: false,
        visitedByteCode: false,
        checking: false
      }));

      // 生成新ID
      const newId = Math.random().toString(36).substring(2, 10);

      // 创建新的会话数据
      const newSession = {
        id: newId,
        createdAt: new Date().toISOString(),
        completed: false,
        websites: newWebsites
      };

      try {
        // 保存到服务器
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSession),
        });

        if (!response.ok) {
          throw new Error('保存会话数据到服务器失败');
        }

        console.log(`已保存新检测会话到服务器: ${newId}`);

        // 同时保存到localStorage作为缓存
        localStorage.setItem(`health_messenger_detection_session_${newId}`, JSON.stringify({
          sessionId: newId,
          timestamp: new Date().toISOString(),
          completed: false,
          websites: newWebsites
        }));
        localStorage.setItem(`tracking_${newId}`, JSON.stringify(newWebsites)); // 向后兼容

        // 跳转到检测页面
        window.location.href = `/detect/${newId}`;
      } catch (error) {
        console.error("创建新检测会话失败:", error);

        // 如果服务器保存失败，至少保存到localStorage
        try {
          localStorage.setItem(`health_messenger_detection_session_${newId}`, JSON.stringify({
            sessionId: newId,
            timestamp: new Date().toISOString(),
            completed: false,
            websites: newWebsites
          }));
          localStorage.setItem(`tracking_${newId}`, JSON.stringify(newWebsites)); // 向后兼容
          window.location.href = `/detect/${newId}`;
        } catch (e) {
          console.error("本地备份保存也失败:", e);
        }
      }
    }
  };

  // 获取已访问的网站
  const visitedWebsites = websites.filter(site => site.visited);

  // 按分类分组网站
  const categories = [...new Set(websites.map(site => site.category || '未分类'))];

  // 过滤网站
  const getFilteredWebsites = () => {
    let filtered = websites;

    // 按搜索词筛选
    if (searchTerm) {
      filtered = filtered.filter(
        (site) =>
          site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          site.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 按标签筛选
    switch (currentTab) {
      case 'visited':
        return filtered.filter(site => site.visited);
      case 'visitedRAF':
        return filtered.filter(site => site.visitedRAF);
      case 'visitedCSS':
        return filtered.filter(site => site.visitedCSS);
      case 'visitedCSS3D':
        return filtered.filter(site => site.visitedCSS3D);
      case 'visitedSVG':
        return filtered.filter(site => site.visitedSVG);
      case 'visitedSVGFilter':
        return filtered.filter(site => site.visitedSVGFilter);
      case 'visitedRenderTiming':
        return filtered.filter(site => site.visitedRenderTiming);
      case 'visitedByteCode':
        return filtered.filter(site => site.visitedByteCode);
      case 'all':
        return filtered;
      default:
        // 按类别筛选
        return filtered.filter(site => site.category === currentTab);
    }
  }

  const filteredWebsites = getFilteredWebsites();

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
            <CardTitle className="text-2xl text-green-700">
              {sessionData?.completed ? "检测结果" : "实时检测结果"}
              {!sessionData?.completed && (
                <span className="ml-2 text-sm font-normal text-green-600 animate-pulse">
                  实时更新中...
                </span>
              )}
            </CardTitle>
            <CardDescription>
              检测ID: {id}
              {sessionData?.completed ? (
                <span className="text-green-600">(已完成)</span>
              ) : (
                <span className="text-yellow-600">(检测中)</span>
              )}
              {sessionData?.timestamp && (
                <span className="ml-2 text-gray-500">
                  {sessionData?.completed ? "完成" : "开始"}时间: {new Date(sessionData.timestamp).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!sessionData?.completed ? (
              <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                <AlertDescription>
                  检测正在进行中，结果会实时更新。当前页面每秒自动刷新数据，确保您看到最新结果。
                  {websites.filter(site => site.visited).length > 0 && (
                    <span className="block mt-1 font-medium">
                      已检测到 {websites.filter(site => site.visited).length} 个已访问网站。
                    </span>
                  )}
                  <span className="block mt-1 text-xs">
                    检测进度: {Math.min(100, Math.round((websites.filter(site => !site.checking && (site.visited !== undefined)).length / websites.length) * 100))}%
                  </span>
                </AlertDescription>
              </Alert>
            ) : websites.length === 0 ? (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>未找到检测数据。可能是检测ID无效或数据已被清除。</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
                  <p className="font-medium mb-2">检测结果摘要</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div className="bg-white p-3 rounded-md border">
                      <p className="text-gray-500 text-sm">检测网站总数</p>
                      <p className="text-2xl font-semibold">{websites.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md border">
                      <p className="text-gray-500 text-sm">已访问网站</p>
                      <p className="text-2xl font-semibold text-green-600">{visitedWebsites.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md border">
                      <p className="text-gray-500 text-sm">检测方法比较</p>
                      <div className="text-sm mt-1">
                        <div className="flex justify-between">
                          <span>RAF检测:</span>
                          <span className="font-medium">{websites.filter(site => site.visitedRAF).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CSS检测:</span>
                          <span className="font-medium">{websites.filter(site => site.visitedCSS).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>3D变换检测:</span>
                          <span className="font-medium">{websites.filter(site => site.visitedCSS3D).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SVG填充检测:</span>
                          <span className="font-medium">{websites.filter(site => site.visitedSVG).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SVG过滤器检测:</span>
                          <span className="font-medium">{websites.filter(site => site.visitedSVGFilter).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>渲染时间检测:</span>
                          <span className="font-medium">{websites.filter(site => site.visitedRenderTiming).length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>字节码检测:</span>
                          <span className="font-medium">{websites.filter(site => site.visitedByteCode).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {visitedWebsites.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm">已访问的网站类型:</p>
                      <div className="flex flex-wrap gap-2">
                        {categories
                          .filter(category =>
                            websites.some(site =>
                              site.visited && site.category === category
                            )
                          )
                          .map(category => (
                            <Badge key={category} className="bg-blue-100 text-blue-800">
                              {category}
                              ({websites.filter(s => s.visited && s.category === category).length})
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">检测的网站列表</h3>
                    <Input
                      placeholder="搜索网站..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-xs"
                    />
                  </div>

                  <Tabs defaultValue="all" className="mb-4" onValueChange={setCurrentTab}>
                    <TabsList className="mb-2 flex flex-wrap">
                      <TabsTrigger value="all">全部</TabsTrigger>
                      <TabsTrigger value="visited">
                        已访问 ({websites.filter(site => site.visited).length})
                      </TabsTrigger>
                      <TabsTrigger value="visitedRAF">
                        RAF ({websites.filter(site => site.visitedRAF).length})
                      </TabsTrigger>
                      <TabsTrigger value="visitedCSS">
                        CSS ({websites.filter(site => site.visitedCSS).length})
                      </TabsTrigger>
                      <TabsTrigger value="visitedCSS3D">
                        3D变换 ({websites.filter(site => site.visitedCSS3D).length})
                      </TabsTrigger>
                      <TabsTrigger value="visitedSVG">
                        SVG填充 ({websites.filter(site => site.visitedSVG).length})
                      </TabsTrigger>
                      <TabsTrigger value="visitedSVGFilter">
                        SVG过滤器 ({websites.filter(site => site.visitedSVGFilter).length})
                      </TabsTrigger>
                      <TabsTrigger value="visitedRenderTiming">
                        渲染时间 ({websites.filter(site => site.visitedRenderTiming).length})
                      </TabsTrigger>
                      <TabsTrigger value="visitedByteCode">
                        字节码 ({websites.filter(site => site.visitedByteCode).length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value={currentTab}>
                      <p className="text-sm text-gray-500 mb-2">
                        显示 {filteredWebsites.length} 个网站
                      </p>
                      <div className="grid gap-3 max-h-[400px] overflow-y-auto p-1">
                        {filteredWebsites.map((website) => (
                          <div className="bg-white p-4 rounded-md border mb-4" key={website.id}>
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium text-lg flex items-center">
                                  {website.name}
                                  {website.visited && <Badge className="ml-2 bg-green-600">已访问</Badge>}
                                </h3>
                                <p className="text-gray-500 text-sm">{website.url}</p>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {website.visitedRAF && (
                                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                      RAF: 已访问
                                    </span>
                                  )}
                                  {website.visitedCSS && (
                                    <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                                      CSS: 已访问
                                    </span>
                                  )}
                                  {website.visitedCSS3D && (
                                    <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                                      3D变换: 已访问
                                    </span>
                                  )}
                                  {website.visitedSVG && (
                                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                      SVG填充: 已访问
                                    </span>
                                  )}
                                  {website.visitedSVGFilter && (
                                    <span className="px-2 py-1 rounded text-xs bg-teal-100 text-teal-800">
                                      SVG过滤器: 已访问
                                    </span>
                                  )}
                                  {website.visitedRenderTiming && (
                                    <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-800">
                                      渲染时间: 已访问
                                    </span>
                                  )}
                                  {website.visitedByteCode && (
                                    <span className="px-2 py-1 rounded text-xs bg-pink-100 text-pink-800">
                                      字节码: 已访问
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" asChild className="text-gray-500 hover:text-gray-700">
                                <a href={website.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-5 w-5" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                        {filteredWebsites.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            没有找到符合条件的网站
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={copyDetectionLink} className="flex-1 bg-green-600 hover:bg-green-700">
                <Copy className="h-5 w-5 mr-2" /> 复制检测链接
              </Button>

              {!sessionData?.completed ? (
                <Button
                  asChild
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Link href={`/detect/${id}`}>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> 查看检测页面
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 border-green-600 text-green-700 hover:bg-green-50"
                >
                  <Link href={`/detect/${id}`}>
                    <RefreshCw className="h-5 w-5 mr-2" /> 重新检测
                  </Link>
                </Button>
              )}

              <Button onClick={createNewDetection} className="flex-1">
                <PlusCircle className="h-5 w-5 mr-2" /> 创建新检测
              </Button>
            </div>

            {showCopyAlert && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>检测链接已复制到剪贴板！您可以将其分享给需要检测的人。</AlertDescription>
              </Alert>
            )}

            {!sessionData?.completed && (
              <p className="text-center text-sm text-gray-500">
                检测正在进行中，此页面每秒自动刷新。您可以在此页面实时查看结果，也可以点击"查看检测页面"按钮查看详细检测进度。
                <span className="block mt-1 font-medium text-green-600">
                  已完成: {Math.min(100, Math.round((websites.filter(site => !site.checking && (site.visited !== undefined)).length / websites.length) * 100))}%
                  {websites.filter(site => site.visited).length > 0 && ` | 已检测到 ${websites.filter(site => site.visited).length} 个已访问网站`}
                </span>
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
