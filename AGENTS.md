# AGENTS.md - 深海专注计时器

## 项目概览

深海主题的番茄专注计时器，核心特色是全屏 Canvas 动画背景（Boids 鱼群、海草、阳光、气泡、珊瑚、礁石），支持任务管理、数据统计、严格模式、声音提醒等功能。番茄以"小鱼干"为单位。

## 技术栈

- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Canvas 2D API（深海动画渲染）
- Web Audio API（声音提醒）
- Notification API（系统通知）
- localStorage（数据持久化）

## 目录结构

```
src/
├── app/
│   ├── layout.tsx          # 根布局，元数据配置
│   ├── page.tsx            # 主页面，组合所有组件
│   └── globals.css         # 全局样式，字体引入，滑块样式
├── components/
│   ├── deep-sea-canvas.tsx # 深海背景动画（核心视觉）
│   ├── pomodoro-timer.tsx  # 番茄钟 + 正计时 + 严格模式
│   ├── task-panel.tsx      # 任务管理面板（左侧）
│   ├── stats-panel.tsx     # 数据统计面板（右侧）
│   ├── settings-panel.tsx  # 设置面板（右下角齿轮）
│   └── ui/                 # shadcn/ui 组件库
└── lib/
    └── utils.ts            # 通用工具函数
```

## 核心模块

### deep-sea-canvas.tsx
- Boids 算法：分离/对齐/聚合三规则驱动鱼群运动
- 海草：三层深度渲染，多频率正弦波叠加，10种色调变化
- 阳光：动态光柱，角度/宽度/透明度随时间变化
- 气泡：随机生成，缓慢上升并左右摇摆
- 珊瑚：三种形态（枝状/扇形/管状），带轻微摆动
- 礁石：不规则多边形，带渐变和纹理
- 海螺：螺旋形状装饰
- 支持专注/休息模式切换（色温变化）
- 所有参数可通过 settings prop 配置，设置变更自动重新初始化实体

### pomodoro-timer.tsx
- 四种模式：专注倒计时 / 休息倒计时 / 正计时（秒表）
- 可配置专注时长（15/25/30/45/60 分钟）
- 可配置短休息时长（3/5/10/15 分钟）
- 可配置长休息时长（15/20/25/30 分钟）
- 可配置长休息间隔（每 3/4/5/6 轮）
- 严格模式：离开页面或暂停会作废当前番茄
- 声音提醒：Web Audio API 生成柔和提示音
- 系统通知：Notification API
- 圆形进度指示器 + 小鱼干计数
- 当前任务名称显示

### task-panel.tsx
- 左侧滑出面板，可收起
- 添加任务 + 预估小鱼干数
- 点击选择当前专注任务
- 完成番茄后自动给当前任务加小鱼干
- 任务完成/删除
- localStorage 持久化

### stats-panel.tsx
- 右侧统计面板，可收起
- 今日统计：小鱼干数 + 专注时长
- 本周柱状图：7天可视化
- 累计统计：总小鱼干 + 总专注时长
- 历史记录：最近14天详情
- localStorage 持久化

### settings-panel.tsx
- 右下角齿轮按钮触发滑出面板
- 计时设置：专注/短休息/长休息时长、长休息间隔
- 专注控制：严格模式、声音提醒、系统通知开关
- 鱼群设置：数量、速度、大小、颜色风格（银光/热带/荧光/金辉）
- 环境设置：气泡开关与密度、海草密度、阳光强度

## 本地启动

```bash
# macOS / Linux
./start.sh

# Windows
start.bat

# 或手动启动
pnpm install
pnpm dev
```

## 数据持久化

所有数据使用 localStorage 存储：
- `deep-sea-settings` - 深海动画设置
- `deep-sea-tasks` - 任务列表
- `deep-sea-records` - 专注记录
- `deep-sea-focus-duration` - 专注时长
- `deep-sea-break-duration` - 休息时长
- `deep-sea-long-break-duration` - 长休息时长
- `deep-sea-long-break-interval` - 长休息间隔
- `deep-sea-strict-mode` - 严格模式
- `deep-sea-sound-enabled` - 声音开关

## 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm lint         # ESLint 检查
```
