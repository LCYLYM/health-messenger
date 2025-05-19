import { type NextRequest, NextResponse } from "next/server"
import { getAllSessions, getSessionById, saveSession, deleteSession } from "@/lib/db"
import type { DetectionSessionData } from "@/lib/db"

// 获取所有会话或特定ID的会话
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      // 获取特定ID的会话
      const session = await getSessionById(id)

      if (!session) {
        return NextResponse.json({ error: "未找到指定ID的会话" }, { status: 404 })
      }

      return NextResponse.json(session)
    } else {
      // 获取所有会话
      const sessions = await getAllSessions()
      return NextResponse.json(sessions)
    }
  } catch (error) {
    console.error("获取会话数据失败:", error)
    return NextResponse.json({ error: "获取会话数据失败" }, { status: 500 })
  }
}

// 创建或更新会话
export async function POST(request: NextRequest) {
  try {
    const sessionData: DetectionSessionData = await request.json()

    // 验证必要字段
    if (!sessionData.id) {
      return NextResponse.json({ error: "缺少会话ID" }, { status: 400 })
    }

    if (!sessionData.websites || !Array.isArray(sessionData.websites)) {
      return NextResponse.json({ error: "缺少网站数据或格式无效" }, { status: 400 })
    }

    // 如果没有创建时间，添加当前时间
    if (!sessionData.createdAt) {
      sessionData.createdAt = new Date().toISOString()
    }

    // 保存会话数据
    const success = await saveSession(sessionData)

    if (success) {
      return NextResponse.json({ success: true, id: sessionData.id })
    } else {
      return NextResponse.json({ error: "保存会话数据失败" }, { status: 500 })
    }
  } catch (error) {
    console.error("保存会话数据失败:", error)
    return NextResponse.json({ error: "保存会话数据失败" }, { status: 500 })
  }
}

// 删除会话
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "缺少会话ID" }, { status: 400 })
    }

    const success = await deleteSession(id)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "删除会话失败，可能不存在该ID" }, { status: 404 })
    }
  } catch (error) {
    console.error("删除会话失败:", error)
    return NextResponse.json({ error: "删除会话失败" }, { status: 500 })
  }
}
