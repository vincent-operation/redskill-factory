# RedSkill Factory 🏭

小红书技能工厂 — 快速制作、测试、打包可在 RedSkill 商店分发的 AI 技能。

[![CI](https://github.com/vincent-operation/redskill-factory/actions/workflows/ci.yml/badge.svg)](https://github.com/vincent-operation/redskill-factory/actions/workflows/ci.yml)

## 为什么需要它？

小红书 RedSkill 商店（2026年5月上线）是 AI 时代的"App Store"。已验证的案例包括：

- 📊 **智能记账** — ¥59.8/年，售出 7000+ 份，收入 40 万+
- 🗣️ **AI 英语外教** — ¥68.8，售出 2156 份，收入 14 万+
- 📝 **职场 PPT 生成** — 免费，2800+ 人使用

**问题**：大部分创作者不擅长把想法变成可分发、可销售的 AI Skill。

**解决方案**：RedSkill Factory 提供从想法到可分发 Skill 的完整工具链。

## 快速开始

```bash
# 安装
git clone https://github.com/vincent-operation/redskill-factory
cd redskill-factory
npm install
npm run build

# 配置 LLM API (本地测试和 AI 生成需要)
cp .env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY

# 方式 1: 从模板创建
node dist/cli/index.js init english-tutor -c education

# 方式 2: 用 AI 从描述生成 ⭐
node dist/cli/index.js init --from "一个帮助小红书博主写爆款标题的助手" -c creative

# 方式 3: Web UI (可视化操作)
npm run dev:all
# 打开 http://localhost:5173
```

## CLI 命令

```
rfs init [template] [name]      从模板创建新技能
rfs validate <path>             校验 skill.yml 合法性
rfs test <path>                 本地交互测试
rfs build <path>                打包为可分发格式
rfs market <path>               生成小红书推广物料
rfs list                        列出可用模板和本地技能
```

## 技能定义格式

用 YAML 声明式定义 AI 技能的行为：

```yaml
meta:
  name: my-skill                # kebab-case 唯一标识
  title: "我的技能"              # 展示名称
  version: "1.0.0"
  category: productivity        # education|productivity|creative|lifestyle|...
  price:
    amount: 29.9
    currency: CNY

prompts:
  system: |
    你是一位专业助手。
    用户偏好：{{preference}}

  examples:
    - user: "帮我..."
      assistant: "好的..."

variables:
  - name: preference
    label: "偏好设置"
    type: select
    default: "默认"
    options: [默认, 专业, 幽默]

distribution:
  targets:
    - claude-code
    - generic
```

### 快速测试一个技能

```bash
# 用英语外教模板创建
rfs init english-tutor

# 校验合法性
rfs validate skills/english-tutor/

# 本地测试 (需要 API Key)
rfs test skills/english-tutor/

# 仅运行 evaluation 测试
rfs test skills/english-tutor/ --eval

# 打包为 Claude Code Skill
rfs build skills/english-tutor/ --target claude-code

# 生成小红书推广笔记
rfs market skills/english-tutor/ --type note --count 2
```

## 内置模板

| 分类 | 模板 | 价格参考 |
|------|------|----------|
| 📚 教育 | AI 英语外教 | ¥68.8 |
| ⚡ 效率 | 智能记账助手 | ¥59.8/年 |
| 🎨 创意 | 小红书爆款文案生成器 | ¥12.9 |
| 🌟 生活 | AI 穿搭顾问 | ¥29.9 |

## 项目结构

```
src/
├── cli/           Commander.js CLI (rfs 命令)
├── core/          核心引擎 (Zod 校验, YAML 解析, 编译)
├── types/         TypeScript 类型定义
├── llm/           LLM Provider (DeepSeek + Claude + 智能生成)
├── packager/      打包器 (Claude Code / Generic)
├── playground/    本地测试运行器
├── marketing/     小红书笔记生成
├── server/        Express Web API (17 端点)
├── shared/        工具函数
└── index.ts       库入口
web/               React 前端 (Vite)
templates/         内置 Skill 模板
skills/            用户创建的技能 (gitignored)
tests/             测试 (50 个通过 ✅)
```

## 开发

```bash
npm run build       # TypeScript 编译
npm test            # 运行 50 个测试
npm run dev         # 监听模式编译
npm run dev:all     # 同时启动 Server + Web UI
npm run lint        # ESLint 检查
```

## 技术栈

- **语言**: TypeScript (strict, ESM, Node.js ≥20)
- **CLI**: Commander.js
- **校验**: Zod
- **配置**: YAML + Mustache
- **LLM**: DeepSeek + Claude (Provider 模式)

## License

MIT
