/**
 * 构建/打包 API 路由
 */
import { Router } from "express";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadSkill } from "../../core/skill-loader.js";
import { resolveSkill } from "../../core/skill-resolver.js";
import { compileForPackager } from "../../core/skill-compiler.js";
import { packageSkill, listPackagers } from "../../packager/registry.js";
import { writeFileSafe, ensureDir } from "../../shared/fs.js";
import { NotFoundError, ValidationError } from "../middleware/error-handler.js";
import type { DistributionTarget } from "../../types/skill.js";

export const buildRouter = Router();

const SKILLS_DIR = resolve(process.cwd(), "skills");
const DIST_DIR = resolve(process.cwd(), "dist");

/**
 * GET /api/v1/build/formats — 可用格式
 */
buildRouter.get("/formats", (_req, res) => {
  res.json({ formats: listPackagers() });
});

/**
 * POST /api/v1/build — 执行打包
 */
buildRouter.post("/", async (req, res) => {
  const { skillName, targets } = req.body as {
    skillName?: string;
    targets?: DistributionTarget[];
  };
  if (!skillName) throw new ValidationError("skillName is required");
  if (!targets?.length) throw new ValidationError("targets is required");

  const ymlPath = resolve(SKILLS_DIR, skillName, `${skillName}.skill.yml`);
  const result = loadSkill(ymlPath);
  if (!result.success || !result.skill) {
    throw new NotFoundError(`Skill '${skillName}'`);
  }

  const skill = result.skill;
  const skillDir = resolve(SKILLS_DIR, skillName);
  const resolved = resolveSkill(skill);
  const input = compileForPackager(skill, resolved, skillDir);

  const outputs = await packageSkill(input, targets);

  // Write to disk
  const outputInfos = outputs.map((output) => {
    const dir = resolve(DIST_DIR, output.directoryName);
    ensureDir(dir);
    for (const file of output.files) {
      writeFileSafe(resolve(dir, file.path), file.content);
    }
    return {
      target: output.target,
      directoryName: output.directoryName,
      files: output.files.map((f) => ({ path: f.path, size: f.content.length })),
    };
  });

  res.json({ outputs: outputInfos });
});

/**
 * GET /api/v1/build/:skillName/download/:filePath(*) — 下载打包产物
 */
buildRouter.get("/:skillName/download/{*filepath}", (req, res) => {
  const filePath = (req.params as Record<string, string | string[] | undefined>).filepath;
  const path = Array.isArray(filePath) ? filePath.join("/") : (filePath ?? "");
  if (!path) throw new ValidationError("File path is required");

  const absPath = resolve(DIST_DIR, path);

  if (!existsSync(absPath)) {
    throw new NotFoundError("File '" + path + "'");
  }

  // 安全检查
  if (!absPath.startsWith(DIST_DIR)) {
    throw new ValidationError("Invalid file path");
  }

  res.download(absPath);
});
