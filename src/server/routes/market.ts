/**
 * 营销内容生成 API
 */
import { Router } from "express";
import { resolve } from "node:path";
import { loadSkill } from "../../core/skill-loader.js";
import { generateMarketingContent } from "../../marketing/note-generator.js";
import { noteTemplates } from "../../marketing/templates.js";
import { NotFoundError, ValidationError } from "../middleware/error-handler.js";

export const marketRouter = Router();

const SKILLS_DIR = resolve(process.cwd(), "skills");

/**
 * GET /api/v1/market/templates — 可用营销模板
 */
marketRouter.get("/templates", (_req, res) => {
  res.json({
    templates: noteTemplates.map((t) => ({
      name: t.name,
      description: t.description,
    })),
  });
});

/**
 * POST /api/v1/market/generate — 生成营销内容
 */
marketRouter.post("/generate", (req, res) => {
  const { skillName, type, count, template: templateName } = req.body as {
    skillName?: string;
    type?: "note" | "cover" | "title";
    count?: number;
    template?: string;
  };
  if (!skillName) throw new ValidationError("skillName is required");

  const ymlPath = resolve(SKILLS_DIR, skillName, `${skillName}.skill.yml`);
  const result = loadSkill(ymlPath);
  if (!result.success || !result.skill) {
    throw new NotFoundError(`Skill '${skillName}'`);
  }

  try {
    const results = generateMarketingContent(result.skill, {
      type: type ?? "note",
      count: count ?? 3,
      template: templateName,
    });
    res.json({ results });
  } catch (err) {
    throw new ValidationError(`Marketing generation failed: ${(err as Error).message}`);
  }
});
