# RedSkill Factory — 小红书技能工厂

> 最后更新: 2026-06-16 01:50
> 版本: 0.2.0 | Git: main | 42 commits

---

## 0. 项目起源

**原始需求**: "新建小红书变现智能体，要求独立仓库"  
**定位**: AI Skill 工厂 — 为小红书创作者提供从想法到可分发 AI Skill 的完整工具链  
**GitHub**: [vincent-operation/redskill-factory](https://github.com/vincent-operation/redskill-factory)  
**技术栈**: TypeScript (strict, ESM, Node.js ≥20) + Express + React + Commander.js

## 1. 项目标识

- **名称**: redskill-factory
- **版本**: 0.2.0
- **Git 分支**: `main`
- **GitHub**: vincent-operation/redskill-factory
- **最近提交**: `e806a16` feat: Landing page trust badges

## 2. 环境参数

| 参数 | 值 | 说明 |
|---|---|---|
| Node.js | ≥20.0.0 | ESM |
| TypeScript | ^5.7 | strict mode |
| 模块系统 | ESM (NodeNext) | `"type": "module"` |
| 包管理器 | npm | — |
| 构建目标 | ES2023 | tsconfig target |
| 平台 | Windows 10 Pro | 开发机 |
| LLM | DeepSeek + Claude | Provider 模式 |

## 3. 已验证命令

```bash
npm run build       # tsc 编译 src/ → dist/
npm test            # 61 tests, 21 suites, 0 lint
npm start           # CLI 入口 (rfs)
npm run dev:all     # concurrently server + web
npm run build:all   # tsc + vite build
npm run start:prod  # 生产模式一键启动
node scripts/scheduler.js --daemon  # 自主运营调度器（后台）
node scripts/daily-report.js        # 生成日报
```

## 4. 核心模块（28 源文件）

```
src/
├── cli/           Commander.js CLI (rfs: init/validate/test/build/market/list)
├── core/          核心引擎 (Zod+YAML+Mustache+License)
├── llm/           LLM Provider (DeepSeek+Claude+Router+SkillGenerator)
├── packager/      打包器 (ClaudeCode/Generic/OpenAIGPT)
├── payment/       支付系统 (WeChat/Alipay双模式)
├── playground/    本地测试运行器
├── marketing/     小红书笔记生成+封面建议(4模板)
├── server/        Express Web API (17端点+8路由)
│   ├── routes/    skills/templates/test/build/market/store/payment/seller/analytics
│   └── middleware/ error-handler/logger/timeout
├── shared/        工具函数
└── types/         TypeScript 类型定义

web/               React 19 + React Router 7 + Vite 6 前端
templates/         内置 Skill 模板 (22个，7品类)
skills/            用户技能 (gitignored)
tests/            61 测试 (core+packager+CLI+server+integration)
scripts/           运维脚本 (scheduler/daily-report/auto-optimize/upload-qr/start-public)
docs/              文档 (PAYMENT_SETUP.md)
.reports/          日报和优化日志
```

## 5. 数据流

```
skill.yml → SkillLoader(parse+validate) → SkillResolver(template vars) → SkillCompiler(Mustache) → Packager → dist/

支付流: Landing Page → 选微信/支付宝 → 扫码付款 → 输入交易号 → 验证 → 签发License
变现流: 创建技能 → 上架商店 → 分享落地页 → 买家购买 → 收款 → License交付
```

## 6. 当前状态

### 产品线 (22个，¥9.9-¥68.8)
| 品类 | 产品数 | 代表产品 |
|---|---|---|
| education | 3 | 英语外教¥68.8, 简历优化¥49.9, 育儿顾问¥49.9 |
| productivity | 4 | 记账¥59.8, 运营增长¥39.9, 翻译¥19.9, 会议¥9.9 |
| creative | 3 | 文案¥12.9, 摄影¥19.9, 视频脚本¥19.9 |
| lifestyle | 4 | 穿搭¥29.9, 饮食¥29.9, 旅行¥19.9, 音乐¥9.9 |
| health | 3 | 睡眠¥29.9, 情绪¥29.9, 健身¥39.9 |
| business | 3 | 电商客服¥39.9, 理财¥39.9, 营销策划¥49.9 |
| tech | 2 | 编程导师¥49.9, PPT生成¥39.9 |

### 支付
- 卖家: @redskill (微信: 晴Jers, 支付宝: 18678969257)
- 收款码: ✅ 已上传
- 模式: QR个人码 (可升级API模式)

### 收入
- 累计: ¥137.6 (2单，均为英语外教)
- 目标ROI: 10,000x Token成本

### 系统
- 61 tests pass, 0 ESLint
- 调度器: 每小时健康检查 + 08:00优化 + 23:00日报
- 隧道: loca.lt 公网（需电脑开机）
- 状态面板: /status.html

## 7. 关键文件速查

| 文件 | 用途 |
|---|---|
| `PARAMS.MD` | 本文件 — 项目规范 |
| `CLAUDE.md` | AI 指令 |
| `xhs-posts-v2.md` | 20篇小红书帖子文案（可点击链接） |
| `xhs-links.md` | 全部技能链接汇总 |
| `covers-final/` | 3张不同设计的封面图 |
| `.reports/master-log.md` | 运营日志 |
| `docs/PAYMENT_SETUP.md` | 支付配置指南 |
| `scripts/scheduler.js` | 自主运营调度器 |

## 8. 变更记录

| 日期 | 变更 |
|---|---|
| 2026-06-16 01:49 | PARAMS.MD 全量重写 — 22产品, 42 commits, 完整基线 |
| 2026-06-15 | 自主运营系统上线 (调度器+日报+优化器) |
| 2026-06-15 | 16篇小红书草稿 + 落地页分享按钮 |
| 2026-06-14 | 支付系统 (微信+支付宝) + 卖家中心 + 商店 |
| 2026-06-14 | 生产加固 (15修复, ESLint清零, 50→61测试) |
| 2026-06-14 | Phase 2 Web UI, Phase 1 MVP |

---

> ⚠ **本文件是项目运行的唯一规范来源。每次代码修改并验证通过后立即更新。下次会话从此文件理解项目全貌。**
