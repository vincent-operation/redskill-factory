# PARAMS.MD — RedSkill Factory 工作规范

> 每次程序修改并验证通过后，立即更新本文档。记录已验证的工作约定、命令、参数和边界条件，作为下次工作的基线。

## 0. 项目起源

**创建日期**: 2026-06-14  
**原始需求**: "新建小红书变现智能体，要求独立仓库"  
**定位**: AI Skill 工厂 — 为小红书创作者提供从想法到可分发 AI Skill 的完整工具链  
**GitHub**: [vincent-operation/redskill-factory](https://github.com/vincent-operation/redskill-factory)  
**技术栈**: TypeScript (strict, ESM, Node.js ≥20) + Commander.js CLI + Express + React  

## 1. 项目标识

- **名称**: redskill-factory (小红书技能工厂)
- **版本**: 0.1.0
- **Git 分支**: `main`
- **最近提交**: `702d7f3` feat: Phase 2 - Web UI dashboard for visual skill management

## 2. 环境参数

| 参数 | 值 | 说明 |
| --- | --- | --- |
| Node.js | ≥20.0.0 | 已通过 ESLint 9 + tsx 4.19 验证 |
| TypeScript | ^5.7 | strict mode |
| 模块系统 | ESM (NodeNext) | `"type": "module"` |
| 包管理器 | npm | — |
| 构建目标 | ES2023 | tsconfig target |
| 平台 | Windows 10 Pro | 开发机 |

## 3. 已验证命令

```bash
# 构建 — tsc 编译 src/ → dist/
npm run build

# 测试 — Node.js 原生 test runner + tsx
npm test

# 启动 CLI
npm start

# 测试 init 命令
node dist/cli/index.js init english-tutor

# 清理构建产物
npm run clean

# 开发服务器
npm run server:dev    # Express API (tsx watch)
npm run web:dev       # Vite 前端 (cd web && npx vite)

# 全栈开发
npm run dev:all       # concurrently server + web

# 全量构建
npm run build:all     # tsc + vite build
```

## 4. 技术约定（已验证）

### 4.1 TypeScript / ESM
- Import 必须带 `.js` 后缀: `import { foo } from './bar.js'`
- 类型导入: `import type { Skill } from '../types/skill.js'`
- strict: true, noUncheckedIndexedAccess: true, noImplicitReturns: true
- noFallthroughCasesInSwitch: true, isolatedModules: true
- 不允许 `.ts` 后缀在 import 中 (`allowImportingTsExtensions: false`)

### 4.2 依赖库
| 库 | 版本 | 用途 |
| --- | --- | --- |
| zod | ^3.24 | 运行时校验 |
| yaml | ^2.7 | Skill 定义解析 |
| mustache | ^4.2 | Prompt 模板 |
| commander | ^13.1 | CLI 框架 |
| chalk | ^5.4 | 终端彩色输出 |
| ora | ^8.2 | 终端 spinner |
| express | ^5.2 | Web API |
| dotenv | ^16.4 | 环境变量 |

### 4.3 错误处理
- 使用 Result 模式或抛出有意义的错误
- Express 错误中间件: `src/server/middleware/error-handler.ts`

### 4.4 文件约定
- 源文件: `src/**/*.ts`
- 测试文件: `tests/**/*.test.ts`
- 构建输出: `dist/` (gitignored)
- 用户 Skill: `skills/` (gitignored)

## 5. 目录结构

```
src/
├── cli/          Commander.js CLI (init/validate/test/build/market/list)
│   ├── index.ts       CLI 入口 → 二进制 rfs
│   ├── utils.ts       工具函数
│   └── commands/      init.ts, validate.ts, test.ts, build.ts, market.ts, list.ts
├── core/         核心引擎
│   ├── skill-definition.ts  Skill 类型 + Zod schema
│   ├── skill-loader.ts      YAML 解析 + 校验
│   ├── skill-resolver.ts    模板变量解析
│   └── skill-compiler.ts    Mustache 渲染 + 编译
├── types/        TypeScript 类型 (skill.ts, package.ts)
├── llm/          LLM Provider (provider.ts, deepseek.ts, claude.ts, router.ts)
├── packager/     打包器 (registry.ts, claude-code.ts, generic.ts)
├── playground/   本地测试运行器 (runner.ts, session.ts, reporter.ts)
├── marketing/    小红书笔记生成 (templates.ts, note-generator.ts)
├── shared/       工具 (logger.ts, fs.ts, config.ts)
├── server/       Express Web API
│   ├── index.ts, app.ts
│   ├── middleware/  error-handler.ts, logger.ts
│   └── routes/     skills.ts, templates.ts, health.ts, test.ts, build.ts, market.ts
└── index.ts      库入口

templates/       内置模板 (education/productivity/creative/lifestyle)
web/             Vite 前端
tests/           测试 (core/)
```

## 6. 数据流

```
skill.yml → SkillLoader (parse + validate)
         → SkillResolver (template vars)
         → SkillCompiler (render via Mustache)
         → Packager (format-specific output)
         → dist/{name}-{target}/
```

## 7. 当前状态与已实现功能

### Phase 1 (MVP) — commit `9297da8`
- [x] CLI: init, validate, build, test, market, list
- [x] Skill 定义/加载/编译/打包
- [x] LLM Provider (DeepSeek + Claude + Router)
- [x] 小红书笔记生成 + 封面建议
- [x] 4 个内置模板 (带定价): 英语外教(68.8元), 智能记账(59.8元), 爆款文案(12.9元), 穿搭顾问(29.9元)
- [x] 51 源文件, **57 单元+集成测试** (17 core + 10 packager + 14 CLI + 9 server + 7 integration)

### Phase 2 (Web UI) — commit `702d7f3`
- [x] Express.js 服务器: 17 REST + SSE API 端点
- [x] React 19 + React Router 7 前端 (Vite 6)
- [x] 6 页面: Dashboard/Editor/Tester/Build/Market/Templates
- [x] React Context + useReducer 状态管理, 纯 CSS 变量样式
- [x] 82 文件总计 (Phase 1: 47 + Phase 2: 35)

## 8. 变更记录

| 日期 | 变更 | 验证 |
| --- | --- | --- |
| 2026-06-14 | 初始化 PARAMS.MD | 构建+测试通过 |
| 2026-06-14 | 合并创建会话历史 (957062e3) — 项目起源、设计决策、模板定价 | 构建+测试通过 |
| 2026-06-14 | #1 B1: 修复 skills.ts 中 `require()` 调用 → ESM `readFileSync` | 构建+17测试通过 |
| 2026-06-14 | #2 B2: 修复 `npm start` → 指向 CLI (`dist/cli/index.js`) | 构建+CLI help 输出 |
| 2026-06-14 | #3 B3: 修复 Session 内存泄漏 — 添加 `lastUsed` + `touch()` + 过期清理 | 构建+17测试通过 |
| 2026-06-14 | #4 M1: 创建 ESLint flat config + 清理 10 个 unused import warning | 构建+17测试+0 lint |
| 2026-06-14 | #5 M5: 修复 `clean` 脚本 → 跨平台 `node --input-type=module` | build→clean→build 成功 |
| 2026-06-14 | #6 M6: 修复 path traversal — 添加 `validateSkillName()` 守卫 | 构建+17测试+0 lint |
| 2026-06-14 | #7 M4: API Key 启动守卫 — `checkRequiredKeys()` 在 server start 时调用 | 构建+17测试通过 |
| 2026-06-14 | #8 TODO: 实现 LLM 智能生成 Skill — `--from` 描述 → AI 生成 skill.yml | 构建+17测试通过 |
| 2026-06-14 | #9 M7: 修复 BuildPage — 多文件下载 + wildcard 路由 | 构建+17测试通过 |
| 2026-06-14 | #10: 新增 packager 测试 (ClaudeCode + Generic, 10 tests) | 构建+27测试+0 lint |
| 2026-06-14 | #11: 新增 CLI 测试 (validate/init/build/list, 14 tests) | 构建+41测试+0 lint |
| 2026-06-14 | #12: 新增 Server 路由测试 (health/build/validate/crud/templates, 9 tests) | 构建+50测试+0 lint |
| 2026-06-14 | 收尾: 修复 sidebar 版本号、market 错误处理、.gitignore web/dist、.env.example 完善、timeout 中间件、build wildcard 类型修复 | 构建+50测试+0 lint |
| 2026-06-14 | CI/CD: GitHub Actions workflow (build+test+lint, Node 20/22) | — |
| 2026-06-14 | README: 更新测试数、Web UI、AI 生成、CI badge | — |
| 2026-06-14 | 集成测试: E2E 管道 + 模板系统 + 产物验证 + 性能 (7 tests) | 构建+57测试+0 lint |

## 9. 使用说明

1. 每次开始工作前，读取本文件了解当前基线
2. 修改代码并通过构建 + 测试验证后，更新相关参数
3. 如果发现新的有效模式或约定，追加到对应章节
4. 所有记录必须是**已验证通过**的，不记录猜测
