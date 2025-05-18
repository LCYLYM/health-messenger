# 🔍 Health Messenger - 浏览器历史检测工具

<div align="center">
  <img src="public/logo.png" alt="Health Messenger Logo" width="180" />
  <br />
  <h3>多方法浏览器历史检测系统</h3>
  <p>一个强大的工具，用于检测用户是否访问过特定网站</p>
  
  ![Next.js](https://img.shields.io/badge/Next.js-13.5+-000000?style=for-the-badge&logo=next.js&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Shadcn UI](https://img.shields.io/badge/Shadcn_UI-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
</div>

## ✨ 特点

- 🚀 **多种检测方法** - 结合7种不同的检测技术，提高检测成功率
- 🔄 **实时更新** - 检测结果实时显示，无需等待全部完成
- 📊 **详细统计** - 提供每种检测方法的详细统计和比较
- 🔗 **可共享链接** - 创建可在不同浏览器间共享的检测链接
- 💾 **JSON文件数据库** - 使用本地JSON文件存储所有数据，确保跨浏览器访问
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🎨 **现代UI** - 使用Shadcn UI和Tailwind CSS构建的美观界面

## 🔧 检测方法

Health Messenger 使用多种先进的检测方法来确定用户是否访问过特定网站：

### 1. RequestAnimationFrame时间差检测
利用浏览器渲染已访问链接和未访问链接时的时间差异，通过精确测量帧渲染时间来检测访问历史。

### 2. CSS状态检测
利用CSS :visited伪类选择器的特性，通过间接计算样式变化来检测链接是否被访问过。

### 3. CSS 3D变换检测
利用CSS 3D变换的渲染性能差异，通过比较复杂3D变换的渲染时间来判断链接状态。

### 4. SVG填充检测
利用SVG图像填充颜色的渲染性能差异，通过测量渲染时间差异来检测访问历史。

### 5. SVG过滤器检测
利用SVG过滤器处理时间差异，通过比较复杂过滤器效果的渲染时间来判断链接状态。

### 6. 渲染时间差异检测
利用复杂CSS样式的渲染时间差异，通过精确测量来检测访问历史。

### 7. JS字节码缓存检测
利用浏览器对已访问网站的JavaScript字节码缓存，通过测量脚本加载和执行时间来判断是否访问过。

## 📸 截图

<div align="center">
  <img src="public/screenshots/create.png" alt="创建检测" width="45%" />
  <img src="public/screenshots/detect.png" alt="检测过程" width="45%" />
  <br />
  <img src="public/screenshots/results.png" alt="检测结果" width="45%" />
  <img src="public/screenshots/history.png" alt="历史记录" width="45%" />
</div>

## 🚀 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 运行开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
# 或
yarn build
# 或
pnpm build
```

## 📁 项目结构

```
health-messenger/
├── app/                  # Next.js 应用目录
│   ├── api/              # API 路由
│   ├── create/           # 创建检测页面
│   ├── detect/           # 检测执行页面
│   ├── results/          # 检测结果页面
│   └── page.tsx          # 首页
├── components/           # UI 组件
├── data/                 # JSON 文件数据库
├── hooks/                # React Hooks
├── lib/                  # 工具函数和检测方法
│   ├── db.ts             # 数据库服务
│   ├── utils.ts          # 检测方法实现
│   └── websites.ts       # 网站数据
└── public/               # 静态资源
```

## 🔒 隐私说明

Health Messenger 仅在本地运行，所有数据都存储在本地JSON文件中。应用不会向任何外部服务器发送数据，确保用户隐私安全。

## 📝 使用场景

- 网络安全研究
- 浏览器技术研究
- 隐私保护教育
- 用户行为分析

## 🤝 贡献

欢迎提交问题和功能请求！如果您想贡献代码，请先创建一个issue讨论您想要更改的内容。

## 📄 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。

---

<div align="center">
  <p>用❤️打造</p>
  <p>Copyright © 2025 Health Messenger</p>
</div>
