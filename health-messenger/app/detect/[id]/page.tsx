"use client"

import { useEffect, useState, useRef } from "react"
import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { checkIfLinkVisited, checkVisitedWithCSS, VisitedResult } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEFAULT_WEBSITES } from "@/lib/websites"

interface Website {
  id: string
  url: string
  name: string
  category?: string
  visited?: boolean
  visitedRAF?: boolean
  visitedCSS?: boolean
  checking?: boolean
}

export default function DetectPage({ params }: { params: { id: string } }) {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [detectionStarted, setDetectionStarted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [progress, setProgress] = useState(0)
  const [currentlyChecking, setCurrentlyChecking] = useState<string | null>(null)
  const [detectionResultsStore, setDetectionResultsStore] = useState<VisitedResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  
  const { id } = params
  const detectionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loadTrackingData = () => {
      try {
        console.log("localStorage中的所有键:", Object.keys(localStorage).join(", "));
        const storedData = localStorage.getItem(`health_messenger_tracking_${id}`)
        if (storedData) {
          console.log(`成功加载ID: ${id}的检测数据`, JSON.parse(storedData).length)
          const parsedData = JSON.parse(storedData).map((site: any) => ({ ...site, visitedRAF: undefined, visitedCSS: undefined, visited: undefined }))
          setWebsites(parsedData)
          setTimeout(() => {
            startDetection(parsedData)
          }, 1000) 
        } else {
          console.error(`未找到检测ID数据: health_messenger_tracking_${id}`)
          console.log("尝试查找可能存在的相关键:", Object.keys(localStorage).filter(key => key.includes('tracking') || key.includes(id)).join(", "))
          const defaultWebsites = DEFAULT_WEBSITES.slice(0, 50).map((site: any) => ({ ...site, visitedRAF: undefined, visitedCSS: undefined, visited: undefined }))
          setWebsites(defaultWebsites)
          setError("未找到检测ID数据，已加载默认网站列表用于演示")
        }
      } catch (error) {
        console.error("加载检测数据失败:", error)
        setError("加载检测数据时出错")
      }
      setLoading(false)
    }
    loadTrackingData()
  }, [id])

  const startDetection = async (sitesToDetect = websites) => {
    if (sitesToDetect.length === 0 || detectionStarted) return
    setDetectionStarted(true)
    setProgress(0)
    setDetectionResultsStore([])
    
    const sitesToCheck = [...sitesToDetect];

    const checkNextWebsite = async (index: number) => {
      if (index >= sitesToCheck.length) {
        finishDetection()
        return
      }
      
      const site = sitesToCheck[index];
      setCurrentlyChecking(site.name);
      setWebsites(prev => prev.map(s => s.id === site.id ? { ...s, checking: true } : s));
      
      try {
        const resultRAF = await checkIfLinkVisited(site.url);
        const resultCSS = await checkVisitedWithCSS(site.url);

        setDetectionResultsStore(prevResults => [
          ...prevResults,
          { ...resultRAF, url: site.url, rafDetected: resultRAF.rafDetected },
          { ...resultCSS, url: site.url, cssDetected: resultCSS.cssDetected }
        ]);

        setWebsites(prev => 
          prev.map(s => s.id === site.id ? 
            { 
              ...s, 
              checking: false, 
              visitedRAF: resultRAF.rafDetected, 
              visitedCSS: resultCSS.cssDetected,
              visited: resultRAF.rafDetected || resultCSS.cssDetected, 
            } : s
          )
        );
        
        const newProgress = Math.round(((index + 1) / sitesToCheck.length) * 100);
        setProgress(newProgress);
        
        detectionTimeout.current = setTimeout(() => checkNextWebsite(index + 1), 100);
      } catch (err) {
        console.error(`检测 ${site.name} (${site.url}) 出错:`, err);
        setError(`检测 ${site.name} 时出错`);
        setWebsites(prev => prev.map(s => s.id === site.id ? { ...s, checking: false } : s));
        detectionTimeout.current = setTimeout(() => checkNextWebsite(index + 1), 100);
      }
    };
    checkNextWebsite(0);
  }
  
  const cancelDetection = () => {
    if (detectionTimeout.current) {
      clearTimeout(detectionTimeout.current);
    }
    setDetectionStarted(false);
    setCurrentlyChecking(null);
  }
  
  const finishDetection = () => {
    setCompleted(true);
    setDetectionStarted(false);
    setCurrentlyChecking(null);
    saveFinalResults();
  }
  
  const saveFinalResults = () => {
    try {
      localStorage.setItem(`health_messenger_websites_${id}`, JSON.stringify(websites));
      console.log(`已保存带分离检测结果的网站数据: health_messenger_websites_${id}`);
      
      localStorage.setItem(`health_messenger_raw_results_${id}`, JSON.stringify(detectionResultsStore));
      console.log(`已保存原始检测日志: health_messenger_raw_results_${id}`);

    } catch (error) {
      console.error("保存最终检测结果失败:", error);
    }
  }

  const getFilteredWebsites = () => {
    let filtered = websites;
    if (searchTerm) {
      filtered = filtered.filter(
        (site) =>
          site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          site.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeTab !== "all") {
      switch (activeTab) {
        case "visitedAll":
          filtered = filtered.filter(site => site.visited)
          break
        case "visitedRAF":
          filtered = filtered.filter(site => site.visitedRAF)
          break
        case "visitedCSS":
          filtered = filtered.filter(site => site.visitedCSS)
          break
      }
    }
    return filtered;
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
        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-green-700">网站访问检测</CardTitle>
                <CardDescription>
                  {completed 
                    ? "检测已完成！"
                    : detectionStarted 
                      ? "正在努力检测中，请稍候..."
                      : "即将开始自动检测..."}
                </CardDescription>
              </div>
              {!detectionStarted && !completed && websites.length > 0 && (
                <Button onClick={() => startDetection()} className="bg-green-600 hover:bg-green-700 ml-2">
                  开始检测
                </Button>
              )}
              {detectionStarted && !completed && (
                <Button onClick={cancelDetection} variant="outline" className="border-red-600 text-red-700 hover:bg-red-50 ml-2">
                  取消检测
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {completed ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
                  <p className="font-medium mb-2">检测结果摘要</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div className="bg-white p-3 rounded-md border">
                      <p className="text-gray-500 text-sm">检测网站总数</p>
                      <p className="text-2xl font-semibold">{websites.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md border">
                      <p className="text-gray-500 text-sm">RAF 检测到访问</p>
                      <p className="text-2xl font-semibold text-blue-600">
                        {websites.filter(site => site.visitedRAF).length}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-md border">
                      <p className="text-gray-500 text-sm">CSS 检测到访问</p>
                      <p className="text-2xl font-semibold text-purple-600">
                        {websites.filter(site => site.visitedCSS).length}
                      </p>
                    </div>
                  </div>
                   <div className="mt-2 text-sm text-gray-600">
                      综合判定已访问 (任一方法检测到): {websites.filter(site => site.visited).length}
                   </div>
                </div>
              
                <Tabs defaultValue="all" className="mb-4" onValueChange={setActiveTab}>
                  <TabsList className="mb-2 grid w-full grid-cols-4">
                    <TabsTrigger value="all">全部</TabsTrigger>
                    <TabsTrigger value="visitedAll">已访问 (综合)</TabsTrigger>
                    <TabsTrigger value="visitedRAF">RAF 已访问</TabsTrigger>
                    <TabsTrigger value="visitedCSS">CSS 已访问</TabsTrigger>
                  </TabsList>
                
                  <TabsContent value={activeTab}> 
                    <div className="mb-4">
                      <Input
                        placeholder="搜索网站名称或URL..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <p className="text-sm text-gray-500">
                        显示 {filteredWebsites.length} / {websites.length} 个网站
                      </p>
                    </div>
                
                    <div className="grid gap-3 max-h-[400px] overflow-y-auto p-1">
                      {filteredWebsites.map((site) => (
                        <div
                          key={site.id}
                          className={`p-3 rounded-md border transition-colors ${site.visited ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium flex items-center">
                                {site.name}
                                {site.visited && (
                                  <Badge className="ml-2 bg-green-600">综合: 已访问</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{site.url}</div>
                              <div className="mt-1 text-xs space-x-2">
                                {site.visitedRAF !== undefined && (
                                  <span className={`px-2 py-1 rounded ${site.visitedRAF ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                                    RAF: {site.visitedRAF ? '已访问' : '未访问'}
                                  </span>
                                )}
                                {site.visitedCSS !== undefined && (
                                  <span className={`px-2 py-1 rounded ${site.visitedCSS ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                                    CSS: {site.visitedCSS ? '已访问' : '未访问'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                              访问
                            </a>
                          </div>
                        </div>
                      ))}
                      {filteredWebsites.length === 0 && <p className="text-center text-gray-500 py-4">未找到匹配的网站。</p>}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="space-y-6">
                {detectionStarted && (
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-500">检测进度: {progress}%</span>
                      {currentlyChecking && (
                        <span className="text-sm text-gray-500">正在检测: {currentlyChecking}</span>
                      )}
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <Input
                  placeholder="开始检测后可搜索网站..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                  disabled={!detectionStarted && !completed}
                />
                <p className="text-sm text-gray-500 mb-4">
                  共 {websites.length} 个网站待检测。
                </p>

                <div className="grid gap-3 max-h-[400px] overflow-y-auto p-1">
                  {websites.slice(0, 10).map((site) => (
                    <div key={site.id} className={`p-3 rounded-md border bg-white`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{site.name}</div>
                          <div className="text-sm text-gray-500">{site.url}</div>
                        </div>
                        {site.checking && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                      </div>
                    </div>
                  ))}
                  {websites.length > 10 && <p className="text-center text-gray-500 py-2">...等 {websites.length -10} 个更多网站</p>}
                </div>

                {!detectionStarted && websites.length > 0 && (
                     <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                        <AlertDescription>
                        点击"开始检测"后，系统将使用RAF和CSS两种方法检测。结果会实时更新。
                        </AlertDescription>
                    </Alert>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter>
            {completed ? (
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link href={`/results/${id}`}>查看完整结果报告</Link>
              </Button>
            ) : (
              <Button
                onClick={detectionStarted ? finishDetection : () => startDetection()}
                disabled={!detectionStarted && websites.length === 0}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {detectionStarted ? (completed ? "已完成" : "手动完成/查看结果") : "开始检测"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 