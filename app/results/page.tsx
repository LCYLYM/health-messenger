"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ResultsSearchPage() {
  const router = useRouter()
  const [trackingId, setTrackingId] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!trackingId.trim()) {
      setError("请输入检测ID")
      return
    }

    // 检查ID是否存在
    const storedData = localStorage.getItem(`tracking_${trackingId}`)

    if (!storedData) {
      setError("未找到该检测ID的数据")
      return
    }

    router.push(`/results/${trackingId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 py-12">
      <div className="container mx-auto px-4">
        <Link href="/" className="text-green-700 hover:text-green-900 mb-8 inline-block">
          ← 返回首页
        </Link>

        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-700">查看检测结果</CardTitle>
            <CardDescription>输入检测ID查看结果</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tracking-id">检测ID</Label>
                <Input
                  id="tracking-id"
                  placeholder="输入检测ID"
                  value={trackingId}
                  onChange={(e) => {
                    setTrackingId(e.target.value)
                    setError("")
                  }}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                查看结果
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
