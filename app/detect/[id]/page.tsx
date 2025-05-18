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
import {
  checkIfLinkVisited,
  checkVisitedWithCSS,
  checkVisitedWithCSS3DTransform,
  checkVisitedWithSVGFill,
  checkVisitedWithSVGFilter,
  checkVisitedWithRenderTiming,
  checkVisitedWithByteCodeCache,
  VisitedResult
} from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEFAULT_WEBSITES } from "@/lib/websites"

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
  checking?: boolean
}

// 检测会话数据结构，用于在localStorage中存储
interface DetectionSessionData {
  sessionId: string
  timestamp: string
  completed: boolean
  websites: Website[]
}

interface DetectionResult {
  url: string
  visited: boolean
  method: "css" | "requestAnimationFrame" | "css3dTransform" | "svgFill" | "svgFilter" | "renderTiming" | "byteCode" | "bytecodeCache"
}

export default function DetectPage({ params }: { params: { id: string } }) {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [detectionStarted, setDetectionStarted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [progress, setProgress] = useState(0)
  const [currentlyChecking, setCurrentlyChecking] = useState<string | null>(null)
  const [results, setResults] = useState<DetectionResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  // 正确使用React.use()解包params
  // 使用类型断言避免类型错误
  const resolvedParams = use(params as any) as { id: string };
  const id = resolvedParams.id;

  const detectionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 从服务器加载网站列表并自动开始检测
  useEffect(() => {
    const loadTrackingData = async () => {
      try {
        // 首先尝试从服务器加载数据
        const response = await fetch(`/api/sessions?id=${id}`);

        if (response.ok) {
          const sessionData = await response.json();
          console.log(`成功从服务器加载会话数据: ${id}`, sessionData.websites.length);

          // 确保websites有效
          if (sessionData.websites && Array.isArray(sessionData.websites) && sessionData.websites.length > 0) {
            setWebsites(sessionData.websites);
            setCompleted(sessionData.completed);

            // 如果会话未完成，立即自动开始检测
            if (!sessionData.completed) {
              // 减少延迟，更快开始检测
              setTimeout(() => {
                startDetection(sessionData.websites);
              }, 500);
            }

            // 同时更新本地缓存
            localStorage.setItem(`health_messenger_detection_session_${id}`, JSON.stringify({
              sessionId: id,
              timestamp: sessionData.createdAt,
              completed: sessionData.completed,
              websites: sessionData.websites
            }));

            setLoading(false);
            return;
          }
        }

        // 如果服务器加载失败，尝试从本地缓存加载
        console.log("从服务器加载失败，尝试从本地缓存加载");
        loadFromLocalStorage();
      } catch (error) {
        console.error("从服务器加载数据失败:", error);
        loadFromLocalStorage();
      }
    };

    // 从本地存储加载数据
    const loadFromLocalStorage = () => {
      try {
        // 尝试读取新格式的会话数据
        const sessionData = localStorage.getItem(`health_messenger_detection_session_${id}`);

        if (sessionData) {
          const parsedSessionData = JSON.parse(sessionData) as DetectionSessionData;
          console.log(`成功从本地缓存加载会话数据: ${id}`, parsedSessionData.websites.length);

          // 确保websites有效
          if (parsedSessionData.websites && Array.isArray(parsedSessionData.websites) && parsedSessionData.websites.length > 0) {
            setWebsites(parsedSessionData.websites);
            setCompleted(parsedSessionData.completed);

            // 如果会话未完成，立即自动开始检测
            if (!parsedSessionData.completed) {
              setTimeout(() => {
                startDetection(parsedSessionData.websites);
              }, 500);
            }
          } else {
            console.error("会话数据中没有有效的网站列表:", parsedSessionData);
            loadFallbackData();
          }
        } else {
          // 回退到旧格式数据
          loadFallbackData();
        }
      } catch (error) {
        console.error("加载本地缓存数据失败:", error);
        setError("加载检测数据时出错");
        loadFallbackData();
      }

      setLoading(false);
    };

    // 加载回退数据的函数
    const loadFallbackData = () => {
      try {
        const storedData = localStorage.getItem(`websites_${id}`);

        if (storedData) {
          console.log(`成功加载ID: ${id}的旧格式检测数据`, JSON.parse(storedData).length);
          const parsedData = JSON.parse(storedData) as Website[];

          if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
            setWebsites(parsedData);

            // 立即自动开始检测，减少延迟
            setTimeout(() => {
              startDetection(parsedData);
            }, 500);
            return;
          }
        }

        console.error(`未找到检测ID数据: ${id}`);

        // 尝试从DEFAULT_WEBSITES加载默认数据，确保至少可以运行
        loadDefaultWebsites();
      } catch (error) {
        console.error("加载回退数据失败:", error);
        loadDefaultWebsites();
      }
    };

    // 加载默认网站列表
    const loadDefaultWebsites = () => {
      // 获取所有真实网站数据，不再限制数量
      const defaultWebsites = DEFAULT_WEBSITES.map(site => ({
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
          visitedSVGFilter: false,
          visitedRenderTiming: false,
          visitedByteCode: false,
          checking: false
        };
        const sitesWithCurrent = [currentSite, ...defaultWebsites];
        setWebsites(sitesWithCurrent);
        console.log("已加载默认网站列表:", sitesWithCurrent.length);
        setError("未找到检测ID数据，已加载默认网站列表用于演示");

        // 自动开始检测
        setTimeout(() => {
          startDetection(sitesWithCurrent);
        }, 500);
      } else {
        setWebsites(defaultWebsites);
        setError("未找到检测ID数据，已加载默认网站列表用于演示");

        // 自动开始检测
        setTimeout(() => {
          startDetection(defaultWebsites);
        }, 500);
      }
    }

    // 初始化时加载数据
    loadTrackingData()
  }, [id])

  // 开始检测
  const startDetection = async (sitesToDetect = websites) => {
    if (sitesToDetect.length === 0 || detectionStarted) return

    console.log(`开始检测，共${sitesToDetect.length}个网站`);
    setDetectionStarted(true)
    setProgress(0)
    setResults([])

    // 复制一个网站列表，我们将在检测过程中更新
    const sitesToCheck = [...sitesToDetect]

    // 设置批量检测的大小，根据网站总数动态调整批量大小
    // 网站数量少时使用较大批量，数量多时使用较小批量，避免浏览器卡顿
    const batchSize = sitesToCheck.length <= 100 ? 10 :
                      sitesToCheck.length <= 200 ? 8 :
                      sitesToCheck.length <= 500 ? 5 : 3;
    const totalBatches = Math.ceil(sitesToCheck.length / batchSize);

    // 开始检测流程 - 使用批量并行检测提高效率
    const checkBatch = async (batchIndex: number) => {
      if (batchIndex >= totalBatches) {
        // 全部检测完成
        console.log(`所有网站检测完成，共检测${sitesToCheck.length}个网站`);
        // 自动完成检测，不需要用户手动点击
        finishDetection()
        return
      }

      // 计算当前批次的起始和结束索引
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, sitesToCheck.length);
      const currentBatchSites = sitesToCheck.slice(startIndex, endIndex);

      // 更新当前正在检测的网站名称
      setCurrentlyChecking(`正在检测 ${startIndex+1}-${endIndex}/${sitesToCheck.length}`)

      // 将当前批次的所有网站标记为正在检测
      setWebsites(prevSites =>
        prevSites.map(s =>
          currentBatchSites.some(site => site.id === s.id)
            ? { ...s, checking: true }
            : s
        )
      )

      try {
        // 并行检测当前批次的所有网站
        const batchPromises = currentBatchSites.map(async (site) => {
          try {
            // 执行不同的检测方法
            // 1. RequestAnimationFrame时间差检测
            const resultRAF = await checkIfLinkVisited(site.url)

            // 2. CSS :visited状态检测
            const resultCSS = await checkVisitedWithCSS(site.url)

            // 3. CSS 3D Transform检测
            const resultCSS3D = await checkVisitedWithCSS3DTransform(site.url)

            // 4. SVG填充检测
            const resultSVG = await checkVisitedWithSVGFill(site.url)

            // 5. SVG过滤器检测（新增方法）
            const resultSVGFilter = await checkVisitedWithSVGFilter(site.url)

            // 6. 渲染时间差异检测（新增方法）
            const resultRenderTiming = await checkVisitedWithRenderTiming(site.url)

            // 7. JS字节码缓存检测
            const resultByteCode = await checkVisitedWithByteCodeCache(site.url)

            // 合并检测结果，只要有一种方法检测到就认为是已访问的
            const combinedVisited = resultRAF.visited ||
                                    resultCSS.visited ||
                                    resultCSS3D.visited ||
                                    resultSVG.visited ||
                                    resultSVGFilter.visited ||
                                    resultRenderTiming.visited ||
                                    resultByteCode.visited;

            // 返回检测结果
            return {
              site,
              results: [
                { url: site.url, visited: resultRAF.visited, method: "requestAnimationFrame" as const },
                { url: site.url, visited: resultCSS.visited, method: "css" as const },
                { url: site.url, visited: resultCSS3D.visited, method: "css3dTransform" as const },
                { url: site.url, visited: resultSVG.visited, method: "svgFill" as const },
                { url: site.url, visited: resultSVGFilter.visited, method: "svgFilter" as const },
                { url: site.url, visited: resultRenderTiming.visited, method: "renderTiming" as const },
                { url: site.url, visited: resultByteCode.visited, method: "byteCode" as const }
              ],
              updatedSite: {
                ...site,
                checking: false,
                visited: combinedVisited,
                visitedRAF: resultRAF.visited,
                visitedCSS: resultCSS.visited,
                visitedCSS3D: resultCSS3D.visited,
                visitedSVG: resultSVG.visited,
                visitedSVGFilter: resultSVGFilter.visited,
                visitedRenderTiming: resultRenderTiming.visited,
                visitedByteCode: resultByteCode.visited
              }
            };
          } catch (error) {
            console.error(`检测网站 ${site.name} 出错:`, error);
            // 返回错误结果
            return {
              site,
              results: [],
              updatedSite: { ...site, checking: false }
            };
          }
        });

        // 等待所有并行检测完成
        const batchResults = await Promise.all(batchPromises);

        // 更新检测结果
        setResults(prevResults => [
          ...prevResults,
          ...batchResults.flatMap(br => br.results)
        ]);

        // 更新网站状态 - 使用函数形式以确保基于最新状态更新
        setWebsites(prevSites => {
          const updatedSites = prevSites.map(s => {
            const batchResult = batchResults.find(br => br.site.id === s.id);
            return batchResult ? batchResult.updatedSite : s;
          });

          // 实时保存更新后的网站数据，使结果可以立即在结果页面查看
          saveDetectionSession(updatedSites, batchIndex === totalBatches - 1);

          return updatedSites;
        });

        // 更新进度
        const newProgress = Math.round(((batchIndex + 1) / totalBatches) * 100)
        setProgress(newProgress)

        // 检测下一批网站（根据批次大小动态调整延迟，避免浏览器卡顿）
        // 批次越大，延迟越长；进度越高，延迟越短（加速完成）
        const delay = Math.max(100, Math.min(300, batchSize * 20 - (newProgress / 2)));
        detectionTimeout.current = setTimeout(() => checkBatch(batchIndex + 1), delay)
      } catch (err) {
        console.error("批量检测出错:", err)
        // 设置临时错误，3秒后自动清除，避免一直显示错误信息
        setError("检测过程中出现错误，正在尝试继续...")
        setTimeout(() => setError(null), 3000)

        // 将当前批次的所有网站标记为未检测
        setWebsites(prevSites => {
          const updatedSites = prevSites.map(s =>
            currentBatchSites.some(site => site.id === s.id)
              ? { ...s, checking: false }
              : s
          );

          // 即使出错也保存当前状态，确保结果页面可以看到部分结果
          saveDetectionSession(updatedSites, false);

          return updatedSites;
        })

        // 尝试继续下一批，使用较长的延迟以便系统恢复
        const recoveryDelay = 500; // 出错后使用较长的恢复延迟
        detectionTimeout.current = setTimeout(() => checkBatch(batchIndex + 1), recoveryDelay)
      }
    }

    // 开始检测第一批网站
    checkBatch(0)
  }

  // 取消检测
  const cancelDetection = () => {
    if (detectionTimeout.current) {
      clearTimeout(detectionTimeout.current)
    }
    setDetectionStarted(false)
    setCurrentlyChecking(null)
  }

  // 完成检测并保存结果
  const finishDetection = () => {
    // 最终更新当前状态
    setCompleted(true)
    setDetectionStarted(false)
    setCurrentlyChecking(null)

    // 获取当前网站列表状态，确保使用最新状态
    setWebsites(currentWebsites => {
      // 保存最终检测结果，标记为已完成
      saveDetectionSession(currentWebsites, true);
      return currentWebsites;
    });
  }

  // 保存检测会话
  const saveDetectionSession = async (websitesData: Website[], isCompleted: boolean) => {
    try {
      // 确保网站数据是数组
      if (!Array.isArray(websitesData) || websitesData.length === 0) {
        console.error("尝试保存无效的网站数据:", websitesData);
        return;
      }

      // 转换成旧格式的results数据
      const detectionResults: DetectionResult[] = [];
      websitesData.forEach(site => {
        if (site.visitedRAF) detectionResults.push({ url: site.url, visited: true, method: "requestAnimationFrame" });
        if (site.visitedCSS) detectionResults.push({ url: site.url, visited: true, method: "css" });
        if (site.visitedCSS3D) detectionResults.push({ url: site.url, visited: true, method: "css3dTransform" });
        if (site.visitedSVG) detectionResults.push({ url: site.url, visited: true, method: "svgFill" });
        if (site.visitedSVGFilter) detectionResults.push({ url: site.url, visited: true, method: "svgFilter" });
        if (site.visitedRenderTiming) detectionResults.push({ url: site.url, visited: true, method: "renderTiming" });
        if (site.visitedByteCode) detectionResults.push({ url: site.url, visited: true, method: "byteCode" });
      });

      // 创建新的会话数据结构，包含结果数据
      const sessionData = {
        id: id, // 使用id作为唯一标识符
        createdAt: new Date().toISOString(),
        completed: isCompleted,
        websites: websitesData,
        results: detectionResults
      };

      // 保存到服务器
      try {
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

        console.log(`已保存检测会话数据到服务器: ${id}`, websitesData.length);
      } catch (serverError) {
        console.error("保存到服务器失败，回退到本地存储:", serverError);
      }

      // 同时保存到localStorage作为缓存
      localStorage.setItem(`health_messenger_detection_session_${id}`, JSON.stringify({
        sessionId: id,
        timestamp: new Date().toISOString(),
        completed: isCompleted,
        websites: websitesData
      }));

      // 为了向后兼容，保存旧格式数据
      localStorage.setItem(`websites_${id}`, JSON.stringify(websitesData));
      localStorage.setItem(
        `result_${id}`,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          completed: isCompleted,
          results: detectionResults
        })
      );
    } catch (error) {
      console.error("保存检测会话数据失败:", error);
    }
  }

  // 筛选网站
  const getFilteredWebsites = () => {
    // 如果网站列表为空直接返回
    if (!websites || websites.length === 0) {
      return [];
    }

    let filtered = websites;

    // 按搜索词筛选
    if (searchTerm) {
      filtered = filtered.filter(
    (site) =>
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          site.url.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 按标签筛选
    if (activeTab !== "all") {
      switch (activeTab) {
        case "visited":
          filtered = filtered.filter(site => site.visited)
          break
        case "visitedRAF":
          filtered = filtered.filter(site => site.visitedRAF)
          break
        case "visitedCSS":
          filtered = filtered.filter(site => site.visitedCSS)
          break
        case "visitedCSS3D":
          filtered = filtered.filter(site => site.visitedCSS3D)
          break
        case "visitedSVG":
          filtered = filtered.filter(site => site.visitedSVG)
          break
        case "visitedSVGFilter":
          filtered = filtered.filter(site => site.visitedSVGFilter)
          break
        case "visitedRenderTiming":
          filtered = filtered.filter(site => site.visitedRenderTiming)
          break
        case "visitedByteCode":
          filtered = filtered.filter(site => site.visitedByteCode)
          break
        default:
          filtered = filtered.filter(site => site.category === activeTab)
      }
    }

    return filtered;
  }

  const filteredWebsites = getFilteredWebsites()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-green-100">
        <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
      </div>
    )
  }

  // 调试信息：显示网站数量和过滤后数量
  console.log(`渲染：网站总数=${websites.length}, 过滤后=${filteredWebsites.length}, 标签=${activeTab}`);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
            <CardTitle className="text-2xl text-green-700">网站访问实时检测</CardTitle>
            <CardDescription>
                  {completed
                    ? "检测已完成，感谢您的配合！结果已保存。"
                    : detectionStarted
                      ? `正在实时检测您是否访问过以下网站... ${currentlyChecking ? `(${currentlyChecking})` : ""}`
                      : "页面加载完成，点击'开始检测'按钮或等待自动开始..."}
            </CardDescription>
              </div>
              {!detectionStarted && !completed && (
                <Button
                  onClick={() => startDetection()}
                  className="bg-green-600 hover:bg-green-700 ml-2"
                >
                  开始检测
                </Button>
              )}
              {detectionStarted && !completed && (
                <Button
                  onClick={cancelDetection}
                  variant="outline"
                  className="border-red-600 text-red-700 hover:bg-red-50 ml-2"
                >
                  取消
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {error ? (
              <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : completed ? (
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
                      <p className="text-2xl font-semibold text-green-600">
                        {websites.filter(site => site.visited).length}
                      </p>
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
                </div>

                <Tabs defaultValue="all" className="mb-4" onValueChange={setActiveTab}>
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

                  <TabsContent value={activeTab}>
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
                      {websites.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          没有网站可显示。正在尝试加载...
                        </div>
                      ) : filteredWebsites.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          没有符合条件的网站
                        </div>
                      ) : (
                        filteredWebsites.map((site) => (
                          <a
                            key={site.id}
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                              block p-3 rounded-md border transition-colors
                              ${site.checking ? 'bg-blue-50 border-blue-200' :
                                site.visited ? 'bg-green-50 border-green-200' : 'bg-white'}
                              hover:bg-gray-50 visited:text-purple-700
                            `}
                          >
                            <div className="flex justify-between">
                              <div>
                                <div className="font-medium">{site.name}</div>
                                <div className="text-sm text-gray-500">{site.url}</div>
                                {(site.visitedRAF || site.visitedCSS || site.visitedCSS3D || site.visitedSVG || site.visitedSVGFilter || site.visitedRenderTiming || site.visitedByteCode) && (
                                  <div className="mt-1 text-xs flex flex-wrap gap-2">
                                    {site.visitedRAF && (
                                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">RAF: 已访问</span>
                                    )}
                                    {site.visitedCSS && (
                                      <span className="px-2 py-1 rounded bg-purple-100 text-purple-800">CSS: 已访问</span>
                                    )}
                                    {site.visitedCSS3D && (
                                      <span className="px-2 py-1 rounded bg-orange-100 text-orange-800">3D: 已访问</span>
                                    )}
                                    {site.visitedSVG && (
                                      <span className="px-2 py-1 rounded bg-green-100 text-green-800">SVG填充: 已访问</span>
                                    )}
                                    {site.visitedSVGFilter && (
                                      <span className="px-2 py-1 rounded bg-teal-100 text-teal-800">SVG过滤器: 已访问</span>
                                    )}
                                    {site.visitedRenderTiming && (
                                      <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800">渲染时间: 已访问</span>
                                    )}
                                    {site.visitedByteCode && (
                                      <span className="px-2 py-1 rounded bg-pink-100 text-pink-800">字节码: 已访问</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {site.checking && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                              {site.visited && <Badge className="bg-green-600">已访问</Badge>}
                            </div>
                          </a>
                        ))
                      )}
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
                        <span className="text-sm text-gray-500">
                          当前检测: {currentlyChecking}
                        </span>
                      )}
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

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
                  {websites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      没有网站可显示。正在尝试加载...
                    </div>
                  ) : filteredWebsites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      没有符合条件的网站
                    </div>
                  ) : (
                    filteredWebsites.map((site) => (
                    <a
                      key={site.id}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                        className={`
                          block p-3 rounded-md border transition-colors
                          ${site.checking ? 'bg-blue-50 border-blue-200' :
                            site.visited ? 'bg-green-50 border-green-200' : 'bg-white'}
                          hover:bg-gray-50 visited:text-purple-700
                        `}
                      >
                        <div className="flex justify-between">
                          <div>
                      <div className="font-medium">{site.name}</div>
                      <div className="text-sm text-gray-500">{site.url}</div>
                            {(site.visitedRAF || site.visitedCSS || site.visitedCSS3D || site.visitedSVG || site.visitedSVGFilter || site.visitedRenderTiming || site.visitedByteCode) && (
                              <div className="mt-1 text-xs flex flex-wrap gap-2">
                                {site.visitedRAF && (
                                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">RAF: 已访问</span>
                                )}
                                {site.visitedCSS && (
                                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-800">CSS: 已访问</span>
                                )}
                                {site.visitedCSS3D && (
                                  <span className="px-2 py-1 rounded bg-orange-100 text-orange-800">3D: 已访问</span>
                                )}
                                {site.visitedSVG && (
                                  <span className="px-2 py-1 rounded bg-green-100 text-green-800">SVG填充: 已访问</span>
                                )}
                                {site.visitedSVGFilter && (
                                  <span className="px-2 py-1 rounded bg-teal-100 text-teal-800">SVG过滤器: 已访问</span>
                                )}
                                {site.visitedRenderTiming && (
                                  <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800">渲染时间: 已访问</span>
                                )}
                                {site.visitedByteCode && (
                                  <span className="px-2 py-1 rounded bg-pink-100 text-pink-800">字节码: 已访问</span>
                                )}
                              </div>
                            )}
                          </div>
                          {site.checking && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                          {site.visited && <Badge className="bg-green-600">已访问</Badge>}
                        </div>
                      </a>
                    ))
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800">
                  <p className="text-sm">
                    <strong>提示：</strong>{" "}
                    系统正在使用多种方法（RequestAnimationFrame、CSS检测、3D变换、SVG填充）实时检测您是否访问过这些网站。检测结果会立即更新并保存，您可以随时查看结果页面。检测完成后会自动跳转到结果页面。
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter>
            <div className="w-full flex flex-col sm:flex-row gap-3">
              {completed ? (
                <>
                  <Button asChild className="flex-1">
                    <Link href="/">返回首页</Link>
                  </Button>
                  <Button asChild className="flex-1 bg-green-600 hover:bg-green-700">
                    <Link href={`/results/${id}`}>查看完整结果</Link>
                  </Button>
                </>
              ) : detectionStarted ? (
                <>
                  <Button
                    onClick={cancelDetection}
                    variant="outline"
                    className="flex-1 border-red-600 text-red-700 hover:bg-red-50"
                  >
                    取消检测
                  </Button>
                  <Button
                    onClick={finishDetection}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    立即完成检测
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => startDetection()}
                  disabled={websites.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  开始检测
                </Button>
              )}
            </div>
            {completed && (
              <p className="text-center text-sm text-gray-500 mt-3">
                检测已完成！您可以查看详细的检测报告，或者关闭此页面。
              </p>
            )}
            {detectionStarted && !completed && (
              <p className="text-center text-sm text-gray-500 mt-3">
                检测正在进行中，结果会实时保存。您可以随时查看结果页面，或等待检测完成。
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
