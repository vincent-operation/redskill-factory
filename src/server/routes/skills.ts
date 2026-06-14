/**
 * 技能 CRUD API 路由
 */
import { Router } from "express";
import { resolve } from "node:path";
import { existsSync, unlinkSync, rmSync } from "node:fs";
import { loadSkill } from "../../core/skill-loader.js";
import { skillDefinitionSchema } from "../../core/skill-definition.js";
import { findSkillFiles, writeFileSafe } from "../../shared/fs.js";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { NotFoundError, ValidationError } from "../middleware/error-handler.js";

export const skillsRouter = Router();

const SKILLS_DIR = resolve(process.cwd(), "skills");

/**
 * GET /api/v1/skills — 列出所有本地技能
 */
skillsRouter.get("/", (_req, res) => {
  const files = findSkillFiles(SKILLS_DIR);
  const skills = files.map((f) => {
    const result = loadSkill(f);
    if (result.success && result.skill) {
      return {
        name: result.skill.meta.name,
        title: result.skill.meta.title,
        version: result.skill.meta.version,
        category: result.skill.meta.category,
        description: result.skill.meta.description,
        author: result.skill.meta.author,
        price: result.skill.meta.price ?? null,
        tags: result.skill.meta.tags,
        path: f,
      };
    }
    return null;
  }).filter(Boolean);

  res.json({ skills });
});

/**
 * GET /api/v1/skills/:name — 获取单个技能
 */
skillsRouter.get("/:name", (req, res) => {
  const ymlPath = resolve(SKILLS_DIR, req.params.name!, `${req.params.name}.skill.yml`);

  if (!existsSync(ymlPath)) {
    throw new NotFoundError(`Skill '${req.params.name}'`);
  }

  const result = loadSkill(ymlPath);
  if (!result.success || !result.skill) {
    throw new ValidationError(result.errors.map((e) => e.message).join("; "));
  }

  const yaml = requireOriginalYaml(ymlPath);
  res.json({ skill: result.skill, yaml, path: ymlPath });
});

/**
 * POST /api/v1/skills — 创建新技能
 */
skillsRouter.post("/", (req, res) => {
  const { yaml, template, name, category } = req.body as {
    yaml?: string;
    template?: string;
    name?: string;
    category?: string;
  };

  let yamlContent: string;

  if (template && name) {
    // 从模板创建
    const cat = category ?? "other";
    const templatePath = resolve(process.cwd(), "templates", cat, `${template}.skill.yml`);
    if (!existsSync(templatePath)) {
      throw new NotFoundError(`Template '${template}' in category '${cat}'`);
    }
    const fs = require("node:fs");
    yamlContent = fs.readFileSync(templatePath, "utf-8");
  } else if (yaml) {
    yamlContent = yaml;
  } else {
    throw new ValidationError("Either 'yaml' or 'template'+'name' is required");
  }

  // 校验
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch {
    throw new ValidationError("Invalid YAML format");
  }
  const validation = skillDefinitionSchema.safeParse(parsed);
  if (!validation.success) {
    throw new ValidationError(
      validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }
  const skillDef = validation.data;

  // 写入
  const skillDir = resolve(SKILLS_DIR, skillDef.meta.name);
  const ymlPath = resolve(skillDir, `${skillDef.meta.name}.skill.yml`);
  writeFileSafe(ymlPath, yamlContent);

  res.status(201).json({ skill: skillDef, path: ymlPath });
});

/**
 * PUT /api/v1/skills/:name — 更新技能
 */
skillsRouter.put("/:name", (req, res) => {
  const { yaml } = req.body as { yaml?: string };
  if (!yaml) {
    throw new ValidationError("Field 'yaml' is required");
  }

  // 校验
  const parsed = parseYaml(yaml);
  const validation = skillDefinitionSchema.safeParse(parsed);
  if (!validation.success) {
    throw new ValidationError(
      validation.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }

  const ymlPath = resolve(SKILLS_DIR, req.params.name!, `${req.params.name}.skill.yml`);
  if (!existsSync(ymlPath)) {
    throw new NotFoundError(`Skill '${req.params.name}'`);
  }

  writeFileSafe(ymlPath, yaml);
  res.json({ skill: validation.data });
});

/**
 * DELETE /api/v1/skills/:name — 删除技能
 */
skillsRouter.delete("/:name", (req, res) => {
  const skillDir = resolve(SKILLS_DIR, req.params.name!);
  if (!existsSync(skillDir)) {
    throw new NotFoundError(`Skill '${req.params.name}'`);
  }

  rmSync(skillDir, { recursive: true });
  res.json({ success: true });
});

/**
 * POST /api/v1/skills/validate — 校验 YAML
 */
skillsRouter.post("/validate", (req, res) => {
  const { yaml } = req.body as { yaml?: string };
  if (!yaml) {
    throw new ValidationError("Field 'yaml' is required");
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(yaml);
  } catch (err) {
    res.json({
      success: false,
      errors: [{ path: "yaml", message: (err as Error).message }],
      warnings: [],
    });
    return;
  }

  const result = skillDefinitionSchema.safeParse(parsed);
  if (!result.success) {
    res.json({
      success: false,
      errors: result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
      warnings: [],
    });
    return;
  }

  res.json({ success: true, errors: [], warnings: [] });
});

function requireOriginalYaml(path: string): string {
  const fs = require("node:fs");
  return fs.readFileSync(path, "utf-8");
}
