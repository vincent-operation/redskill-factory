/**
 * 模板 API 路由
 */
import { Router } from "express";
import { resolve } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { loadSkill } from "../../core/skill-loader.js";
import { findSkillFiles } from "../../shared/fs.js";
import { NotFoundError } from "../middleware/error-handler.js";

export const templatesRouter = Router();

const TEMPLATES_DIR = resolve(process.cwd(), "templates");

/**
 * GET /api/v1/templates — 按分类列出模板
 */
templatesRouter.get("/", (_req, res) => {
  if (!existsSync(TEMPLATES_DIR)) {
    res.json({ templates: {} });
    return;
  }

  const templates: Record<string, unknown[]> = {};
  const categories = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const cat of categories) {
    const catDir = resolve(TEMPLATES_DIR, cat.name);
    const files = findSkillFiles(catDir);
    templates[cat.name] = files.map((f) => {
      const result = loadSkill(f);
      if (result.success && result.skill) {
        return {
          name: result.skill.meta.name,
          title: result.skill.meta.title,
          category: result.skill.meta.category,
          description: result.skill.meta.description,
          price: result.skill.meta.price ?? null,
        };
      }
      return null;
    }).filter(Boolean);
  }

  res.json({ templates });
});

/**
 * GET /api/v1/templates/:category/:name — 获取模板 YAML 内容
 */
templatesRouter.get("/:category/:name", (req, res) => {
  const { category, name } = req.params;
  const ymlPath = resolve(TEMPLATES_DIR, category!, `${name}.skill.yml`);

  if (!existsSync(ymlPath)) {
    throw new NotFoundError(`Template '${name}' in '${category}'`);
  }

  const yaml = readFileSync(ymlPath, "utf-8");
  res.json({ name, category, yaml });
});
