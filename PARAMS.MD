# RedSkill Factory — 小红书技能工厂 — 参数与运行规范

> 最后更新: 2026-06-16 02:01
> 自动生成于: 2026-06-16 02:01
> 项目路径: d:\redskill-factory
> 版本: 0.2.0 | 43 commits | 22产品 | 61测试

---

## 0. 项目起源
"新建小红书变现智能体，要求独立仓库" → AI Skill 工厂，完整工具链。
GitHub: vincent-operation/redskill-factory | TypeScript strict ESM Node≥20

## 1. 项目标识
名称: redskill-factory | 版本: 0.2.0 | 分支: main | 43 commits

## 2. 环境参数
Node.js ≥20 ESM | TS 5.7 strict | npm | ES2023 | Windows 10 | DeepSeek+Claude LLM

## 3. 已验证命令
```bash
npm run build        # tsc
npm test             # 61 tests, 21 suites, 0 lint
npm run dev:all      # server+web concurrently
npm run build:all    # tsc+vite
npm run start:prod   # 生产模式
node scripts/scheduler.js --daemon  # 自主运营后台
node scripts/daily-report.js        # 日报
```

## 4. 核心模块 (28源文件)
```
src/ → cli/ core/ llm/ packager/ payment/ playground/ marketing/ server/ shared/ types/
web/ (React19+Vite6) templates/ (22技能) tests/ (61) scripts/ (运维)
```

## 5. 数据流
skill.yml → Loader → Resolver → Compiler → Packager → dist/
支付: 落地页 → 扫码 → 输入交易号 → 验证 → License

## 6. 当前状态
### 产品线 (22个, ¥9.9-¥68.8)
教育(3): 英语外教68.8, 简历49.9, 育儿49.9
效率(4): 记账59.8, 运营39.9, 翻译19.9, 会议9.9
创意(3): 文案12.9, 摄影19.9, 视频脚本19.9
生活(4): 穿搭29.9, 饮食29.9, 旅行19.9, 音乐9.9
健康(3): 睡眠29.9, 情绪29.9, 健身39.9
商业(3): 电商39.9, 理财39.9, 营销49.9
科技(2): 编程49.9, PPT39.9

### 支付
卖家@redskill: 微信晴Jers, 支付宝18678969257, 收款码已上传
累计收入¥137.6(2单英语外教) | 目标ROI 10,000x Token成本

### 自主运营
调度器(每小时检查/08:00优化/23:00日报) | 状态面板/status.html
日报.reports/daily-*.md | 封面covers-all/22张 | 文案xhs-posts-v2.md(可点击超链接)

## 7. 关键文件
xhs-posts-v2.md(20篇文案) | covers-all/(22封面) | docs/PAYMENT_SETUP.md
scripts/scheduler.js | scripts/daily-report.js | scripts/auto-optimize.js

## 8. 变更记录
| 时间 | 说明 |
|------|------|
| 2026-06-16 02:01 | PARAMS.MD重写(含自动扫描头部) — 22产品, 43 commits, 基线 |
| 2026-06-15 | 自主运营系统(调度器+日报+优化器), 20篇XHS文案, 落地页转化优化 |
| 2026-06-14 | 支付系统(微信+支付宝), 卖家中心, 生产加固(61测试,0lint) |

---

> ⚠ 本文件是项目运行的唯一规范来源。每次代码修改验证通过后自动更新。
