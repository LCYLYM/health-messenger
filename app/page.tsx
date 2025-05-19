import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold text-green-800 mb-2">健康使者</h1>
          <p className="text-lg text-green-600">帮助家长发现青少年是否浏览不良网站</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl text-green-700">自定义检测链接</CardTitle>
              <CardDescription>创建一个自定义的网站访问检测链接</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                您可以使用我们的真实网站数据库（包含成人内容、社交媒体、视频平台等各分类的真实网站），创建一个检测链接。
              </p>
              <p className="text-gray-600 mb-4">
                当有人打开您的链接时，系统会立即自动开始检测并实时保存结果，无需手动点击开始。
              </p>
              <p className="text-gray-600">
                <strong>实时检测：</strong> 您可以在结果页面实时查看检测进度和结果，每秒自动刷新，无需等待检测完成。
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link href="/create">创建检测链接</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl text-green-700">查看检测结果</CardTitle>
              <CardDescription>查看您已创建的检测链接的结果</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">如果您已经创建了检测链接并分享给了他人，您可以在这里查看检测结果。</p>
              <p className="text-gray-600 mb-4">
                输入您的检测ID，实时查看检测进度和哪些网站被访问过，系统会自动每秒刷新最新结果。
              </p>
              <p className="text-gray-600">
                <strong>动态更新：</strong>{" "}
                检测结果会实时更新，包括检测进度百分比和已检测到的网站数量，无需等待检测完成即可查看。
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                <Link href="/results">查看结果</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>健康使者 © {new Date().getFullYear()} - 保护青少年健康上网</p>
        </footer>
      </div>
    </div>
  )
}
