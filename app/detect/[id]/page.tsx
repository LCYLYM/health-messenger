"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, CheckCircle2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { enhancedHistoryDetection } from "@/lib/utils"
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
  confidenceLevel?: "high" | "medium" | "low" | "error"
  weightedScore?: number
  positiveDetections?: string[]
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
  method:
    | "css"
    | "requestAnimationFrame"
    | "css3dTransform"
    | "svgFill"
    | "svgFilter"
    | "renderTiming"
    | "byteCode"
    | "bytecodeCache"
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
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  // 直接从params获取id
  const id = params.id

  const detectionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 设置加载超时，防止无限加载
  useEffect(() => {
    // 如果10秒后仍在加载，显示超时提示并尝试继续
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true)
        // 强制结束加载状态，使用默认数据
        setLoading(false)

        // 如果网站列表为空，使用默认网站列表
        if (websites.length === 0) {
          const defaultWebsites = DEFAULT_WEBSITES.map((site) => ({
            ...site,
            visited: false,
            visitedCSS: false,
            visitedRAF: false,
            visitedCSS3D: false,
            visitedSVG: false,
            visitedSVGFilter: false,
            visitedRenderTiming: false,
            visitedByteCode: false,
            checking: false,
          }))

          // 添加当前网站作为第一个测试项
          if (typeof window !== "undefined") {
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
              checking: false,
            }
            defaultWebsites.unshift(currentSite)
          }

          setWebsites(defaultWebsites)

          // 立即开始检测
          setTimeout(() => {
            startDetection(defaultWebsites)
          }, 100)
        }
      }
    }, 10000)

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [loading, websites.length])

  // 从本地缓存加载网站列表
  const loadFromLocalStorage = () => {
    try {
      const storedWebsites = localStorage.getItem(`websites_${id}`)
      const storedSession = localStorage.getItem(`health_messenger_detection_session_${id}`)

      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession)
          console.log(`成功从本地缓存加载会话数据: ${id}`, sessionData.websites?.length || 0)

          // 确保websites有效
          if (sessionData.websites && Array.isArray(sessionData.websites) && sessionData.websites.length > 0) {
            // 确保每个网站对象都有完整的检测状态字段
            const websitesWithStatus = sessionData.websites.map((site) => ({
              ...site,
              visited: site.visited || false,
              visitedCSS: site.visitedCSS || false,
              visitedRAF: site.visitedRAF || false,
              visitedCSS3D: site.visitedCSS3D || false,
              visitedSVG: site.visitedSVG || false,
              visitedSVGFilter: site.visitedSVGFilter || false,
              visitedRenderTiming: site.visitedRenderTiming || false,
              visitedByteCode: site.visitedByteCode || false,
              checking: false,
            }))

            // 添加当前网站作为第一个测试项
            if (typeof window !== "undefined") {
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
                checking: false,
              }
              websitesWithStatus.unshift(currentSite)
            }

            setWebsites(websitesWithStatus)
            setCompleted(sessionData.completed || false)
            setLoading(false)

            // 无论会话是否完成，都立即开始检测
            console.log("从本地缓存加载后立即开始检测")
            setTimeout(() => startDetection(websitesWithStatus), 100)
            return true
          }
        } catch (parseError) {
          console.error("解析会话数据失败:", parseError)
        }
      }

      if (storedWebsites) {
        try {
          const parsedWebsites = JSON.parse(storedWebsites)
          console.log(`成功从本地缓存加载旧格式网站数据: ${id}`, parsedWebsites?.length || 0)

          // 确保websites有效
          if (parsedWebsites && Array.isArray(parsedWebsites) && parsedWebsites.length > 0) {
            // 确保每个网站对象都有完整的检测状态字段
            const websitesWithStatus = parsedWebsites.map((site) => ({
              ...site,
              visited: site.visited || false,
              visitedCSS: site.visitedCSS || false,
              visitedRAF: site.visitedRAF || false,
              visitedCSS3D: site.visitedCSS3D || false,
              visitedSVG: site.visitedSVG || false,
              visitedSVGFilter: site.visitedSVGFilter || false,
              visitedRenderTiming: site.visitedRenderTiming || false,
              visitedByteCode: site.visitedByteCode || false,
              checking: false,
            }))

            // 添加当前网站作为第一个测试项
            if (typeof window !== "undefined") {
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
                checking: false,
              }
              websitesWithStatus.unshift(currentSite)
            }

            setWebsites(websitesWithStatus)
            setLoading(false)

            // 立即开始检测
            setTimeout(() => startDetection(websitesWithStatus), 100)
            return true
          }
        } catch (parseError) {
          console.error("解析网站数据失败:", parseError)
        }
      }

      // 如果本地缓存没有数据，则使用默认网站列表
      console.warn("本地缓存没有数据，使用默认网站列表")
      const defaultWebsites = DEFAULT_WEBSITES.map((site) => ({
        ...site,
        visited: false,
        visitedCSS: false,
        visitedRAF: false,
        visitedCSS3D: false,
        visitedSVG: false,
        visitedSVGFilter: false,
        visitedRenderTiming: false,
        visitedByteCode: false,
        checking: false,
      }))

      // 添加当前网站作为第一个测试项
      if (typeof window !== "undefined") {
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
          checking: false,
        }
        defaultWebsites.unshift(currentSite)
      }

      setWebsites(defaultWebsites)
      setLoading(false)

      // 立即开始检测
      setTimeout(() => startDetection(defaultWebsites), 100)
      return true
    } catch (error) {
      console.error("从本地缓存加载数据失败:", error)
      const defaultWebsites = DEFAULT_WEBSITES.map((site) => ({
        ...site,
        visited: false,
        visitedCSS: false,
        visitedRAF: false,
        visitedCSS3D: false,
        visitedSVG: false,
        visitedSVGFilter: false,
        visitedRenderTiming: false,
        visitedByteCode: false,
        checking: false,
      }))

      // 添加当前网站作为第一个测试项
      if (typeof window !== "undefined") {
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
          checking: false,
        }
        defaultWebsites.unshift(currentSite)
      }

      setWebsites(defaultWebsites)
      setLoading(false)

      // 立即开始检测
      setTimeout(() => startDetection(defaultWebsites), 100)
      return true
    }
  }

  // 从服务器加载网站列表并自动开始检测
  const loadTrackingData = async () => {
    try {
      // 首先尝试从服务器加载数据
      const response = await fetch(`/api/sessions?id=${id}`)

      if (response.ok) {
        try {
          const sessionData = await response.json()
          console.log(`成功从服务器加载会话数据: ${id}`, sessionData.websites?.length || 0)

          // 确保websites有效
          if (sessionData.websites && Array.isArray(sessionData.websites) && sessionData.websites.length > 0) {
            // 确保每个网站对象都有完整的检测状态字段
            const websitesWithStatus = sessionData.websites.map((site) => ({
              ...site,
              visited: site.visited || false,
              visitedCSS: site.visitedCSS || false,
              visitedRAF: site.visitedRAF || false,
              visitedCSS3D: site.visitedCSS3D || false,
              visitedSVG: site.visitedSVG || false,
              visitedSVGFilter: site.visitedSVGFilter || false,
              visitedRenderTiming: site.visitedRenderTiming || false,
              visitedByteCode: site.visitedByteCode || false,
              checking: false,
            }))

            // 添加当前网站作为第一个测试项
            if (typeof window !== "undefined") {
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
                checking: false,
              }
              websitesWithStatus.unshift(currentSite)
            }

            setWebsites(websitesWithStatus)
            setCompleted(sessionData.completed || false)

            // 无论会话是否完成，都立即开始检测
            console.log("从服务器加载后立即开始检测")
            setTimeout(() => startDetection(websitesWithStatus), 100)

            // 同时更新本地缓存
            localStorage.setItem(
              `health_messenger_detection_session_${id}`,
              JSON.stringify({
                sessionId: id,
                timestamp: sessionData.createdAt,
                completed: sessionData.completed,
                websites: websitesWithStatus,
              }),
            )

            setLoading(false)
            return true
          }
        } catch (parseError) {
          console.error("解析服务器数据失败:", parseError)
        }
      }

      // 如果服务器加载失败，尝试从本地缓存加载
      console.log("从服务器加载失败，尝试从本地缓存加载")
      return loadFromLocalStorage()
    } catch (error) {
      console.error("从服务器加载数据失败:", error)
      return loadFromLocalStorage()
    }
  }

  // 修改 useEffect 中的自动开始逻辑，加快启动速度
  useEffect(() => {
    // 立即加载数据
    const loadData = async () => {
      try {
        const success = await loadTrackingData()
        if (!success) {
          // 如果加载失败，使用默认数据
          const defaultWebsites = DEFAULT_WEBSITES.map((site) => ({
            ...site,
            visited: false,
            visitedCSS: false,
            visitedRAF: false,
            visitedCSS3D: false,
            visitedSVG: false,
            visitedSVGFilter: false,
            visitedRenderTiming: false,
            visitedByteCode: false,
            checking: false,
          }))

          // 添加当前网站作为第一个测试项
          if (typeof window !== "undefined") {
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
              checking: false,
            }
            defaultWebsites.unshift(currentSite)
          }

          setWebsites(defaultWebsites)
          setLoading(false)

          // 立即开始检测
          setTimeout(() => startDetection(defaultWebsites), 100)
        }
      } catch (error) {
        console.error("加载数据失败:", error)
        // 出错时使用默认数据
        const defaultWebsites = DEFAULT_WEBSITES.map((site) => ({
          ...site,
          visited: false,
          visitedCSS: false,
          visitedRAF: false,
          visitedCSS3D: false,
          visitedSVG: false,
          visitedSVGFilter: false,
          visitedRenderTiming: false,
          visitedByteCode: false,
          checking: false,
        }))

        // 添加当前网站作为第一个测试项
        if (typeof window !== "undefined") {
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
            checking: false,
          }
          defaultWebsites.unshift(currentSite)
        }

        setWebsites(defaultWebsites)
        setLoading(false)

        // 立即开始检测
        setTimeout(() => startDetection(defaultWebsites), 100)
      }
    }

    loadData()

    // 添加快速自动开始检测逻辑
    // 如果300ms后仍未开始检测，则强制开始
    const autoStartTimeout = setTimeout(() => {
      if (!detectionStarted && !completed && websites.length > 0) {
        console.log("快速自动开始检测触发")
        startDetection(websites)
      }
    }, 300)

    // 组件卸载时清除定时器
    return () => {
      if (detectionTimeout.current) {
        clearTimeout(detectionTimeout.current)
      }
      clearTimeout(autoStartTimeout)
    }
  }, [id])

  // 修改 startDetection 函数，优化批处理逻辑和检测速度
  const startDetection = async (sitesToDetect = websites) => {
    // 防止重复开始检测
    if (sitesToDetect.length === 0 || detectionStarted) {
      console.log("检测未开始: 网站列表为空或检测已经开始")
      return
    }

    // 立即设置检测已开始状态，防止重复调用
    setDetectionStarted(true)

    console.log(`开始检测，共${sitesToDetect.length}个网站`)
    setProgress(0)
    setResults([])

    // 复制一个网站列表，我们将在检测过程中更新
    const sitesToCheck = [...sitesToDetect]

    // 优化批量检测的大小，根据网站总数和设备性能动态调整
    // 使用更大的批量大小，加快检测速度
    const batchSize =
      sitesToCheck.length <= 50
        ? 20
        : sitesToCheck.length <= 100
          ? 15
          : sitesToCheck.length <= 200
            ? 10
            : sitesToCheck.length <= 500
              ? 8
              : 5
    const totalBatches = Math.ceil(sitesToCheck.length / batchSize)

    // 开始检测流程 - 使用批量并行检测提高效率
    const checkBatch = async (batchIndex: number) => {
      if (batchIndex >= totalBatches) {
        // 全部检测完成
        console.log(`所有网站检测完成，共检测${sitesToCheck.length}个网站`)
        // 自动完成检测，不需要用户手动点击
        finishDetection()
        return
      }

      // 计算当前批次的起始和结束索引
      const startIndex = batchIndex * batchSize
      const endIndex = Math.min(startIndex + batchSize, sitesToCheck.length)
      const currentBatchSites = sitesToCheck.slice(startIndex, endIndex)

      // 更新当前正在检测的网站名称
      setCurrentlyChecking(`正在检测 ${startIndex + 1}-${endIndex}/${sitesToCheck.length}`)

      // 将当前批次的所有网站标记为正在检测
      setWebsites((prevSites) =>
        prevSites.map((s) => (currentBatchSites.some((site) => site.id === s.id) ? { ...s, checking: true } : s)),
      )

      try {
        // 并行检测当前批次的所有网站，使用Promise.all提高效率
        const batchPromises = currentBatchSites.map(async (site) => {
          try {
            // Use the enhanced combined detection for better accuracy
            const enhancedResult = await enhancedHistoryDetection(site.url)

            // Extract all detection results
            const {
              visited,
              visitedCSS,
              visitedRAF,
              visitedCSS3D,
              visitedSVG,
              visitedSVGFilter,
              visitedRenderTiming,
              visitedByteCode,
              confidenceLevel,
              weightedScore,
              positiveDetections,
            } = enhancedResult

            return {
              site,
              results: [
                { url: site.url, visited: visitedRAF, method: "requestAnimationFrame" as const },
                { url: site.url, visited: visitedCSS, method: "css" as const },
                { url: site.url, visited: visitedCSS3D, method: "css3dTransform" as const },
                { url: site.url, visited: visitedSVG, method: "svgFill" as const },
                { url: site.url, visited: visitedSVGFilter, method: "svgFilter" as const },
                { url: site.url, visited: visitedRenderTiming, method: "renderTiming" as const },
                { url: site.url, visited: visitedByteCode, method: "byteCode" as const },
              ],
              updatedSite: {
                ...site,
                checking: false,
                visited,
                visitedRAF,
                visitedCSS,
                visitedCSS3D,
                visitedSVG,
                visitedSVGFilter,
                visitedRenderTiming,
                visitedByteCode,
                confidenceLevel,
                weightedScore,
                positiveDetections,
              },
            }
          } catch (error) {
            console.error(`检测网站 ${site.name} 出错:`, error)
            // Return error result
            return {
              site,
              results: [],
              updatedSite: { ...site, checking: false },
            }
          }
        })

        // 等待所有并行检测完成
        const batchResults = await Promise.all(batchPromises)

        // 更新检测结果
        setResults((prevResults) => [...prevResults, ...batchResults.flatMap((br) => br.results)])

        // 更新网站状态 - 使用函数形式以确保基于最新状态更新
        setWebsites((prevSites) => {
          const updatedSites = prevSites.map((s) => {
            const batchResult = batchResults.find((br) => br.site.id === s.id)
            return batchResult ? batchResult.updatedSite : s
          })

          // 实时保存更新后的网站数据，使结果可以立即在结果页面查看
          saveDetectionSession(updatedSites, batchIndex === totalBatches - 1)

          return updatedSites
        })

        // 更新进度
        const newProgress = Math.round(((batchIndex + 1) / totalBatches) * 100)
        setProgress(newProgress)

        // 检测下一批网站（减少延迟，加快检测速度）
        // 使用固定的短延迟，确保UI有时间更新但不会过度延迟
        const delay = 30 // 固定使用30ms的短延迟
        detectionTimeout.current = setTimeout(() => checkBatch(batchIndex + 1), delay)
      } catch (err) {
        console.error("批量检测出错:", err)
        // 设置临时错误，3秒后自动清除，避免一直显示错误信息
        setError("检测过程中出现错误，正在尝试继续...")
        setTimeout(() => setError(null), 3000)

        // 将当前批次的所有网站标记为未检测
        setWebsites((prevSites) => {
          const updatedSites = prevSites.map((s) =>
            currentBatchSites.some((site) => site.id === s.id) ? { ...s, checking: false } : s,
          )

          // 即使出错也保存当前状态，确保结果页面可以看到部分结果
          saveDetectionSession(updatedSites, false)

          return updatedSites
        })

        // 尝试继续下一批，使用较短的延迟以加快恢复
        const recoveryDelay = 200 // 减少恢复延迟
        detectionTimeout.current = setTimeout(() => checkBatch(batchIndex + 1), recoveryDelay)
      }
    }

    // 开始检测第一批网站
    checkBatch(0)
  }

  // 完成检测并保存结果
  const finishDetection = () => {
    // 最终更新当前状态
    setCompleted(true)
    setDetectionStarted(false)
    setCurrentlyChecking(null)

    // 获取当前网站列表状态，确保使用最新状态
    setWebsites((currentWebsites) => {
      // 保存最终检测结果，标记为已完成
      saveDetectionSession(currentWebsites, true)

      // 短暂延迟后跳转到结果页面，确保数据已保存
      setTimeout(() => {
        window.location.href = `/results/${id}`
      }, 500)

      return currentWebsites
    })
  }

  // 保存检测会话
  const saveDetectionSession = async (websitesData: Website[], isCompleted: boolean) => {
    try {
      // 确保网站数据是数组
      if (!Array.isArray(websitesData) || websitesData.length === 0) {
        console.error("尝试保存无效的网站数据:", websitesData)
        return
      }

      // 转换成旧格式的results数据
      const detectionResults: DetectionResult[] = []
      websitesData.forEach((site) => {
        if (site.visitedRAF) detectionResults.push({ url: site.url, visited: true, method: "requestAnimationFrame" })
        if (site.visitedCSS) detectionResults.push({ url: site.url, visited: true, method: "css" })
        if (site.visitedCSS3D) detectionResults.push({ url: site.url, visited: true, method: "css3dTransform" })
        if (site.visitedSVG) detectionResults.push({ url: site.url, visited: true, method: "svgFill" })
        if (site.visitedSVGFilter) detectionResults.push({ url: site.url, visited: true, method: "svgFilter" })
        if (site.visitedRenderTiming) detectionResults.push({ url: site.url, visited: true, method: "renderTiming" })
        if (site.visitedByteCode) detectionResults.push({ url: site.url, visited: true, method: "byteCode" })
      })

      // 创建新的会话数据结构，包含结果数据
      const sessionData = {
        id: id, // 使用id作为唯一标识符
        createdAt: new Date().toISOString(),
        completed: isCompleted,
        websites: websitesData,
        results: detectionResults,
      }

      // 保存到服务器
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sessionData),
        })

        if (!response.ok) {
          throw new Error("保存会话数据到服务器失败")
        }

        console.log(`已保存检测会话数据到服务器: ${id}`, websitesData.length)
      } catch (serverError) {
        console.error("保存到服务器失败，回退到本地存储:", serverError)
      }

      // 同时保存到localStorage作为缓存
      localStorage.setItem(
        `health_messenger_detection_session_${id}`,
        JSON.stringify({
          sessionId: id,
          timestamp: new Date().toISOString(),
          completed: isCompleted,
          websites: websitesData,
        }),
      )

      // 为了向后兼容，保存旧格式数据
      localStorage.setItem(`websites_${id}`, JSON.stringify(websitesData))
      localStorage.setItem(
        `result_${id}`,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          completed: isCompleted,
          results: detectionResults,
        }),
      )
    } catch (error) {
      console.error("保存检测会话数据失败:", error)
    }
  }

  // 筛选网站
  const getFilteredWebsites = () => {
    // 如果网站列表为空直接返回
    if (!websites || websites.length === 0) {
      return []
    }

    let filtered = websites

    // 按搜索词筛选
    if (searchTerm) {
      filtered = filtered.filter(
        (site) =>
          site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          site.url.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // 按标签筛选
    if (activeTab !== "all") {
      switch (activeTab) {
        case "visited":
          filtered = filtered.filter((site) => site.visited)
          break
        case "visitedRAF":
          filtered = filtered.filter((site) => site.visitedRAF)
          break
        case "visitedCSS":
          filtered = filtered.filter((site) => site.visitedCSS)
          break
        case "visitedCSS3D":
          filtered = filtered.filter((site) => site.visitedCSS3D)
          break
        case "visitedSVG":
          filtered = filtered.filter((site) => site.visitedSVG)
          break
        case "visitedSVGFilter":
          filtered = filtered.filter((site) => site.visitedSVGFilter)
          break
        case "visitedRenderTiming":
          filtered = filtered.filter((site) => site.visitedRenderTiming)
          break
        case "visitedByteCode":
          filtered = filtered.filter((site) => site.visitedByteCode)
          break
        default:
          filtered = filtered.filter((site) => site.category === activeTab)
      }
    }

    return filtered
  }

  const filteredWebsites = getFilteredWebsites()

  // 改进加载状态显示
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-green-100 p-4">
        <div className="text-center mb-6">
          <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-800 mb-2">正在加载检测数据</h2>
          <p className="text-gray-600 max-w-md">正在准备网站列表和检测环境，这可能需要几秒钟时间...</p>
        </div>

        {loadingTimeout && (
          <Alert className="max-w-md bg-yellow-50 border-yellow-200 text-yellow-800 mt-4">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>
              加载时间较长，正在尝试使用默认数据继续。如果页面长时间未响应，请刷新页面重试。
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  // 改进页面布局和样式
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-8 px-4">
      <div className="container mx-auto">
        <Card className="max-w-4xl mx-auto shadow-lg border-green-100">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-green-700 flex items-center">
                  <span className="mr-2">网站访问检测</span>
                  {detectionStarted && !completed && (
                    <span className="inline-block animate-pulse">
                      <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                    </span>
                  )}
                  {completed && <CheckCircle2 className="h-5 w-5 text-green-600 ml-2" />}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  {completed
                    ? "检测已完成，感谢您的配合！结果已保存。"
                    : detectionStarted
                      ? `正在实时检测您是否访问过以下网站... ${currentlyChecking ? `(${currentlyChecking})` : ""}`
                      : "页面加载中，检测即将自动开始..."}
                </CardDescription>
              </div>
              {!detectionStarted && !completed && (
                <Button onClick={() => startDetection()} className="bg-green-600 hover:bg-green-700 ml-2">
                  开始检测
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {error ? (
              <Alert className="mb-6 bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : completed ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-md p-5 text-green-800 shadow-sm">
                  <p className="font-medium mb-3 text-lg">检测结果摘要</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div className="bg-white p-4 rounded-md border shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-gray-500 text-sm mb-1">检测网站总数</p>
                      <p className="text-2xl font-semibold">{websites.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-md border shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-gray-500 text-sm mb-1">已访问网站</p>
                      <p className="text-2xl font-semibold text-green-600">
                        {websites.filter((site) => site.visited).length}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-md border shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-gray-500 text-sm mb-1">检测方法比较</p>
                      <div className="text-sm mt-2">
                        <div className="flex justify-between mb-1">
                          <span>RAF检测:</span>
                          <span className="font-medium">{websites.filter((site) => site.visitedRAF).length}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>CSS检测:</span>
                          <span className="font-medium">{websites.filter((site) => site.visitedCSS).length}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>3D变换检测:</span>
                          <span className="font-medium">{websites.filter((site) => site.visitedCSS3D).length}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>SVG填充检测:</span>
                          <span className="font-medium">{websites.filter((site) => site.visitedSVG).length}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>SVG过滤器检测:</span>
                          <span className="font-medium">{websites.filter((site) => site.visitedSVGFilter).length}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span>渲染时间检测:</span>
                          <span className="font-medium">
                            {websites.filter((site) => site.visitedRenderTiming).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>字节码检测:</span>
                          <span className="font-medium">{websites.filter((site) => site.visitedByteCode).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="all" className="mb-4" onValueChange={setActiveTab}>
                  <TabsList className="mb-3 flex flex-wrap bg-gray-100 p-1 rounded-md">
                    <TabsTrigger value="all" className="data-[state=active]:bg-white">
                      全部
                    </TabsTrigger>
                    <TabsTrigger value="visited" className="data-[state=active]:bg-white">
                      已访问 ({websites.filter((site) => site.visited).length})
                    </TabsTrigger>
                    <TabsTrigger value="visitedRAF" className="data-[state=active]:bg-white">
                      RAF ({websites.filter((site) => site.visitedRAF).length})
                    </TabsTrigger>
                    <TabsTrigger value="visitedCSS" className="data-[state=active]:bg-white">
                      CSS ({websites.filter((site) => site.visitedCSS).length})
                    </TabsTrigger>
                    <TabsTrigger value="visitedCSS3D" className="data-[state=active]:bg-white">
                      3D变换 ({websites.filter((site) => site.visitedCSS3D).length})
                    </TabsTrigger>
                    <TabsTrigger value="visitedSVG" className="data-[state=active]:bg-white">
                      SVG填充 ({websites.filter((site) => site.visitedSVG).length})
                    </TabsTrigger>
                    <TabsTrigger value="visitedSVGFilter" className="data-[state=active]:bg-white">
                      SVG过滤器 ({websites.filter((site) => site.visitedSVGFilter).length})
                    </TabsTrigger>
                    <TabsTrigger value="visitedRenderTiming" className="data-[state=active]:bg-white">
                      渲染时间 ({websites.filter((site) => site.visitedRenderTiming).length})
                    </TabsTrigger>
                    <TabsTrigger value="visitedByteCode" className="data-[state=active]:bg-white">
                      字节码 ({websites.filter((site) => site.visitedByteCode).length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab}>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="搜索网站..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 mb-2 border-gray-300 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        显示 {filteredWebsites.length} 个网站，共 {websites.length} 个
                      </p>
                    </div>

                    <div className="grid gap-3 max-h-[400px] overflow-y-auto p-1 rounded-md">
                      {websites.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>没有网站可显示。正在尝试加载...</p>
                        </div>
                      ) : filteredWebsites.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                          <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p>没有符合条件的网站</p>
                        </div>
                      ) : (
                        filteredWebsites.map((site) => (
                          <a
                            key={site.id}
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                              block p-4 rounded-md border transition-all hover:shadow-md
                              ${
                                site.checking
                                  ? "bg-blue-50 border-blue-200"
                                  : site.visited
                                    ? "bg-green-50 border-green-200"
                                    : "bg-white hover:bg-gray-50"
                              }
                              visited:text-purple-700
                            `}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-lg">{site.name}</div>
                                <div className="text-sm text-gray-500 mt-1">{site.url}</div>

                                {site.visited && site.weightedScore !== undefined && (
                                  <div className="mt-1 mb-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${
                                          site.confidenceLevel === "high"
                                            ? "bg-green-600"
                                            : site.confidenceLevel === "medium"
                                              ? "bg-yellow-500"
                                              : "bg-red-400"
                                        }`}
                                        style={{ width: `${Math.round(site.weightedScore * 100)}%` }}
                                      ></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      检测置信度: {Math.round(site.weightedScore * 100)}%
                                    </p>
                                  </div>
                                )}

                                {(site.visitedRAF ||
                                  site.visitedCSS ||
                                  site.visitedCSS3D ||
                                  site.visitedSVG ||
                                  site.visitedSVGFilter ||
                                  site.visitedRenderTiming ||
                                  site.visitedByteCode) && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {site.visitedRAF && (
                                      <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                                        RAF: 已访问
                                      </span>
                                    )}
                                    {site.visitedCSS && (
                                      <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs">
                                        CSS: 已访问
                                      </span>
                                    )}
                                    {site.visitedCSS3D && (
                                      <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs">
                                        3D: 已访问
                                      </span>
                                    )}
                                    {site.visitedSVG && (
                                      <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                                        SVG填充: 已访问
                                      </span>
                                    )}
                                    {site.visitedSVGFilter && (
                                      <span className="px-2 py-1 rounded bg-teal-100 text-teal-800 text-xs">
                                        SVG过滤器: 已访问
                                      </span>
                                    )}
                                    {site.visitedRenderTiming && (
                                      <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-xs">
                                        渲染时间: 已访问
                                      </span>
                                    )}
                                    {site.visitedByteCode && (
                                      <span className="px-2 py-1 rounded bg-pink-100 text-pink-800 text-xs">
                                        字节码: 已访问
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center">
                                {site.checking && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                                {site.visited && (
                                  <Badge className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    已访问
                                    {site.confidenceLevel && (
                                      <span className="ml-1 text-xs">
                                        (
                                        {site.confidenceLevel === "high"
                                          ? "高"
                                          : site.confidenceLevel === "medium"
                                            ? "中"
                                            : "低"}
                                        )
                                      </span>
                                    )}
                                  </Badge>
                                )}
                              </div>
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
                    <div className="flex justify-between mb-2 items-center">
                      <span className="text-sm text-gray-600 font-medium">检测进度: {progress}%</span>
                      {currentlyChecking && (
                        <span className="text-sm text-gray-600 flex items-center">
                          <Loader2 className="h-3 w-3 mr-1 text-green-600 animate-spin" />
                          {currentlyChecking}
                        </span>
                      )}
                    </div>
                    <Progress value={progress} className="h-2 bg-gray-200" indicatorClassName="bg-green-600" />
                  </div>
                )}

                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="搜索网站..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 mb-2 border-gray-300 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    显示 {filteredWebsites.length} 个网站，共 {websites.length} 个
                  </p>
                </div>

                <div className="grid gap-3 max-h-[400px] overflow-y-auto p-1 rounded-md">
                  {websites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>没有网站可显示。正在尝试加载...</p>
                    </div>
                  ) : filteredWebsites.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                      <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>没有符合条件的网站</p>
                    </div>
                  ) : (
                    filteredWebsites.map((site) => (
                      <a
                        key={site.id}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`
                          block p-4 rounded-md border transition-all hover:shadow-md
                          ${
                            site.checking
                              ? "bg-blue-50 border-blue-200"
                              : site.visited
                                ? "bg-green-50 border-green-200"
                                : "bg-white hover:bg-gray-50"
                          }
                          visited:text-purple-700
                        `}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-lg">{site.name}</div>
                            <div className="text-sm text-gray-500 mt-1">{site.url}</div>
                            {(site.visitedRAF ||
                              site.visitedCSS ||
                              site.visitedCSS3D ||
                              site.visitedSVG ||
                              site.visitedSVGFilter ||
                              site.visitedRenderTiming ||
                              site.visitedByteCode) && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {site.visitedRAF && (
                                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                                    RAF: 已访问
                                  </span>
                                )}
                                {site.visitedCSS && (
                                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs">
                                    CSS: 已访问
                                  </span>
                                )}
                                {site.visitedCSS3D && (
                                  <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs">
                                    3D: 已访问
                                  </span>
                                )}
                                {site.visitedSVG && (
                                  <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                                    SVG填充: 已访问
                                  </span>
                                )}
                                {site.visitedSVGFilter && (
                                  <span className="px-2 py-1 rounded bg-teal-100 text-teal-800 text-xs">
                                    SVG过滤器: 已访问
                                  </span>
                                )}
                                {site.visitedRenderTiming && (
                                  <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-xs">
                                    渲染时间: 已访问
                                  </span>
                                )}
                                {site.visitedByteCode && (
                                  <span className="px-2 py-1 rounded bg-pink-100 text-pink-800 text-xs">
                                    字节码: 已访问
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center">
                            {site.checking && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                            {site.visited && (
                              <Badge className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> 已访问
                              </Badge>
                            )}
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>

                <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 shadow-sm">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <AlertDescription>
                      系统正在使用多种方法（RequestAnimationFrame、CSS检测、3D变换、SVG填充等）实时检测您是否访问过这些网站。检测结果会立即更新并保存，检测完成后会自动跳转到结果页面。
                    </AlertDescription>
                  </div>
                </Alert>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-gray-50 border-t border-gray-100 p-6">
            <div className="w-full flex flex-col sm:flex-row gap-3">
              {completed ? (
                <>
                  <Button asChild className="flex-1 bg-gray-600 hover:bg-gray-700">
                    <Link href="/">返回首页</Link>
                  </Button>
                  <Button asChild className="flex-1 bg-green-600 hover:bg-green-700">
                    <Link href={`/results/${id}`}>查看完整结果</Link>
                  </Button>
                </>
              ) : detectionStarted ? (
                <Button onClick={finishDetection} className="w-full bg-green-600 hover:bg-green-700">
                  立即完成检测
                </Button>
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
