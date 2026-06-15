# RedSkill Factory — 小红书技能工厂

为创作者提供从想法到可分发 AI Skill 的完整工具链。

## 项目概述

- **语言**: TypeScript (strict, ESM, Node.js ≥20)
- **CLI 入口**: `src/cli/index.ts` → 二进制命令 `rfs`
- **构建**: `npm run build` (tsc → dist/)
- **测试**: `npm test` (Node.js 原生 test runner + tsx)

## 目录结构

```
src/
├── cli/          Commander.js CLI (rfs init/validate/test/build/market/list)
├── core/         核心引擎 (Zod 校验, YAML 解析, 模板解析, 编译)
├── types/        TypeScript 类型定义
├── llm/          LLM Provider 抽象 (DeepSeek + Claude)
├── packager/     打包器注册表 (Claude Code / OpenAI GPT / Hermes / Generic)
├── playground/   本地测试运行器
├── marketing/    小红书笔记生成 + 封面建议
└── shared/       工具函数 (logger, fs, config)

templates/       内置 Skill 模板 (education/productivity/creative/lifestyle)
skills/          用户创建的 Skill (gitignored)
tests/           测试 (core + packager + fixtures)
```

## 关键命令

```bash
npm run build        # TypeScript 编译
npm test             # 运行测试
npm start            # 运行 CLI
node dist/cli/index.js init english-tutor  # 测试 init 命令
```

## PARAMS.md 机制

**PARAMS.MD 是本项目的唯一工作机制和规范来源。**

每次代码修改并验证通过后，必须立即更新 PARAMS.MD：
- 记录参数变更、新增配置项、API 变更
- 更新版本号和时间戳
- 确保下次会话可直接从 PARAMS.MD 理解项目全貌

## 技术约定

- ESM imports 必须带 `.js` 后缀 (`import { foo } from './bar.js'`)
- 类型导入使用 `import type { ... }`
- Zod 用于运行时校验 (`z.object({...})`)
- YAML 用于 Skill 定义格式
- Mustache 用于 Prompt 模板 (`{{variable}}`)
- 错误处理：使用 Result 模式或抛出有意义的错误

## 数据流

```
skill.yml → SkillLoader (parse + validate)
         → SkillResolver (template vars)
         → SkillCompiler (render)
         → Packager (format-specific output)
         → dist/{name}-{target}/
```
