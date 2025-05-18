"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ExternalLink, Copy, RefreshCw, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// VisitedResult from utils might be useful if displaying raw timing data, but for now, website object holds display status
// import { VisitedResult } from "@/lib/utils" 

interface Website {
  id: string
  url: string
  name: string
  category?: string
  visited?: boolean      // 综合访问
  visitedRAF?: boolean   // RAF 检测结果
  visitedCSS?: boolean   // CSS 检测结果
}

// This interface is for the raw results log, if we decide to load it for more details.
// interface RawDetectionLogEntry extends VisitedResult {}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  // const [rawResultsLog, setRawResultsLog] = useState<RawDetectionLogEntry[]>([]) // Optional: for detailed log view
  const [detectionTimestamp, setDetectionTimestamp] = useState<string | null>(null)
  const [showCopyAlert, setShowCopyAlert] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<string>("all")
  
  const { id } = params

  useEffect(() => {
    const loadResultData = () => {
      setLoading(true);
      try {
        console.log("localStorage中的所有键 (Results Page):", Object.keys(localStorage).join(", "));
        const websitesDataString = localStorage.getItem(`health_messenger_websites_${id}`);
        const rawResultsString = localStorage.getItem(`health_messenger_raw_results_${id}`); // For timestamp or more details
        
        let loadedWebsites: Website[] = [];

        if (websitesDataString) {
          console.log(`从 health_messenger_websites_${id} 加载网站数据成功`);
          loadedWebsites = JSON.parse(websitesDataString);
        } else {
          // Fallback: Try to load from tracking_id if websites_id is missing (old format or incomplete saving)
          const trackingDataString = localStorage.getItem(`health_messenger_tracking_${id}`);
          if (trackingDataString) {
            console.warn(`health_messenger_websites_${id} 未找到, 回退到 health_messenger_tracking_${id}`);
            loadedWebsites = JSON.parse(trackingDataString).map((site: any) => ({ // Initialize with undefined detection states
              ...site,
              visited: undefined,
              visitedRAF: undefined,
              visitedCSS: undefined
            }));
          } else {
            console.error(`未找到 health_messenger_websites_${id} 或 health_messenger_tracking_${id} 数据`);
          }
        }
        setWebsites(loadedWebsites);

        if (rawResultsString) {
          // Extract timestamp from the first entry if available, assuming rawResults are an array
          const rawLog = JSON.parse(rawResultsString);
          if (Array.isArray(rawLog) && rawLog.length > 0 && rawLog[0].timestamp) { // Assuming VisitedResult might have a timestamp
             // For now, we don't store a global timestamp in raw_results. 
             // Let's use a generic one or try to infer from websites_ data if it had a wrapper
          } else {
            // If raw_results itself was an object with a timestamp (like old result_id)
            // const oldResultFormat = JSON.parse(rawResultsString); 
            // if(oldResultFormat.timestamp) setDetectionTimestamp(oldResultFormat.timestamp);
          }
          // setRawResultsLog(rawLog); // If needed for display
        }
        // Attempt to get a general timestamp from a potential old format, or use current time as fallback
        const oldResultData = localStorage.getItem(`health_messenger_result_${id}`); // Legacy key
        if(oldResultData) {
            try {
                const parsedOldResult = JSON.parse(oldResultData);
                if(parsedOldResult.timestamp) setDetectionTimestamp(parsedOldResult.timestamp);
            } catch (e) { /* ignore parsing error */ }
        }
        if (!detectionTimestamp) {
             // If no specific timestamp found, and we have websites, imply it was recent.
            if (loadedWebsites.length > 0) setDetectionTimestamp(new Date().toISOString());
        }

      } catch (error) {
        console.error("加载结果数据失败:", error);
        setWebsites([]); // Clear websites on error
      }
      setLoading(false);
    }
    loadResultData();
  }, [id, detectionTimestamp]); // Added detectionTimestamp to dependencies to avoid re-triggering if already set

  const copyDetectionLink = () => {
    const link = `${window.location.origin}/detect/${id}`;
    navigator.clipboard.writeText(link);
    setShowCopyAlert(true);
    setTimeout(() => setShowCopyAlert(false), 3000);
  }

  const visitedByRAFCount = websites.filter(site => site.visitedRAF).length;
  const visitedByCSSCount = websites.filter(site => site.visitedCSS).length;
  const visitedOverallCount = websites.filter(site => site.visited).length; // Based on site.visited = site.visitedRAF || site.visitedCSS
  
  const categories = [...new Set(websites.map(site => site.category || '未分类'))];
  
  const getFilteredWebsites = () => {
    let filtered = websites;
    if (searchTerm) {
      filtered = filtered.filter(
        (site) =>
          site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          site.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (currentTab !== "all") {
      switch (currentTab) {
        case "visitedAll":
          filtered = filtered.filter(site => site.visited);
          break;
        case "visitedRAF":
          filtered = filtered.filter(site => site.visitedRAF);
          break;
        case "visitedCSS":
          filtered = filtered.filter(site => site.visitedCSS);
          break;
        default: // Assuming other tabs are categories
          if (categories.includes(currentTab)) {
            filtered = filtered.filter(site => (site.category || '未分类') === currentTab);
          }
          break;
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
        <Link href="/" className="text-green-700 hover:text-green-900 mb-8 inline-block">
          ← 返回首页
        </Link>

        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-700">检测结果报告</CardTitle>
            <CardDescription>
              检测ID: <span className="font-semibold">{id}</span>
              {detectionTimestamp && (
                <span className="ml-2 text-gray-500">
                  检测时间: {new Date(detectionTimestamp).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {websites.length === 0 ? (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  未找到此检测ID (<span className="font-mono">{id}</span>) 的结果数据。可能链接已过期、数据被清除或ID无效。
                  请尝试使用新的检测链接。
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
                  <p className="font-medium mb-3 text-lg">结果摘要</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-md border shadow">
                      <p className="text-gray-500 text-sm mb-1">检测网站总数</p>
                      <p className="text-3xl font-semibold">{websites.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-md border shadow">
                      <p className="text-gray-500 text-sm mb-1">RAF 检测到访问</p>
                      <p className="text-3xl font-semibold text-blue-600">{visitedByRAFCount}</p>
                    </div>
                    <div className="bg-white p-4 rounded-md border shadow">
                      <p className="text-gray-500 text-sm mb-1">CSS 检测到访问</p>
                      <p className="text-3xl font-semibold text-purple-600">{visitedByCSSCount}</p>
                    </div>
                    <div className="bg-white p-4 rounded-md border shadow">
                      <p className="text-gray-500 text-sm mb-1">综合判定已访问</p>
                      <p className="text-3xl font-semibold text-green-600">{visitedOverallCount}</p>
                    </div>
                  </div>
                  {visitedOverallCount > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <p className="mb-2 text-sm font-medium">已访问的网站类型 (综合):</p>
                      <div className="flex flex-wrap gap-2">
                        {categories
                          .filter(category => 
                            websites.some(site => site.visited && (site.category || '未分类') === category)
                          )
                          .map(category => (
                            <Badge key={category} variant="secondary" className="text-sm">
                              {category} 
                              ({websites.filter(s => s.visited && (s.category || '未分类') === category).length})
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                    <h3 className="text-xl font-semibold">详细检测列表</h3>
                    <Input
                      placeholder="搜索网站名称或URL..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-xs w-full sm:w-auto"
                    />
                  </div>
                  
                  <Tabs defaultValue="all" className="mb-4" onValueChange={setCurrentTab}>
                    <TabsList className="mb-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 h-auto flex-wrap">
                      <TabsTrigger value="all" className="flex-1">全部 ({websites.length})</TabsTrigger>
                      <TabsTrigger value="visitedAll" className="flex-1">已访问 ({visitedOverallCount})</TabsTrigger>
                      <TabsTrigger value="visitedRAF" className="flex-1">RAF访问 ({visitedByRAFCount})</TabsTrigger>
                      <TabsTrigger value="visitedCSS" className="flex-1">CSS访问 ({visitedByCSSCount})</TabsTrigger>
                      {/* Dynamically add category tabs */}
                      {categories.map(category => (
                        (category !== 'test') && // Exclude test category from main tabs if desired
                        <TabsTrigger key={category} value={category} className="flex-1">
                          {category} ({websites.filter(s => (s.category || '未分类') === category).length})
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <TabsContent value={currentTab}>
                      <p className="text-sm text-gray-500 mb-3">
                        显示 {filteredWebsites.length} 个匹配网站
                      </p>
                      <div className="grid gap-4">
                        {filteredWebsites.map((site) => (
                          <div 
                            key={site.id} 
                            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border shadow-sm ${site.visited ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                          >
                            <div className="flex-grow mb-2 sm:mb-0">
                              <div className="flex items-center mb-1">
                                <p className="font-semibold text-lg mr-2">{site.name}</p>
                                {site.category && site.category !=='test' && (
                                  <Badge variant="outline" className="text-xs mr-2">{site.category}</Badge>
                                )}
                                {site.visited && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">综合: 已访问</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 break-all">{site.url}</p>
                              <div className="mt-2 text-xs space-x-2 flex flex-wrap gap-1">
                                {site.visitedRAF !== undefined && (
                                   <Badge variant={site.visitedRAF ? "default" : "secondary"} className={`${site.visitedRAF ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>RAF: {site.visitedRAF ? '已访问' : '未访问'}</Badge>
                                )}
                                {site.visitedCSS !== undefined && (
                                   <Badge variant={site.visitedCSS ? "default" : "secondary"} className={`${site.visitedCSS ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>CSS: {site.visitedCSS ? '已访问' : '未访问'}</Badge>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-800 mt-2 sm:mt-0 sm:ml-4 shrink-0">
                              <a href={site.url} target="_blank" rel="noopener noreferrer">
                                打开链接 <ExternalLink className="h-4 w-4 ml-1" />
                              </a>
                            </Button>
                          </div>
                        ))}
                        {filteredWebsites.length === 0 && (
                          <div className="text-center py-10 text-gray-500">
                            <Info className="h-8 w-8 mx-auto mb-2" />
                            没有找到符合当前筛选条件的网站。
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col items-stretch space-y-4 pt-6 border-t">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button onClick={copyDetectionLink} className="flex-1 bg-green-600 hover:bg-green-700 py-3">
                <Copy className="h-5 w-5 mr-2" /> 复制此结果的检测链接
              </Button>
              <Button asChild variant="outline" className="flex-1 border-green-600 text-green-700 hover:bg-green-50 py-3">
                <Link href={`/detect/${id}`}>
                  <RefreshCw className="h-5 w-5 mr-2" /> 使用相同配置重新检测
                </Link>
              </Button>
            </div>

            {showCopyAlert && (
              <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
                 <Info className="h-4 w-4" />
                <AlertDescription>新检测链接已复制！您可以分享此链接以启动基于相同网站列表的新检测会话。</AlertDescription>
              </Alert>
            )}
             <Button asChild variant="link" className="text-gray-600">
                <Link href="/create">创建新的检测</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
} 