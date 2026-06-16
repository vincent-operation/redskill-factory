#!/usr/bin/env node
/**
 * RedSkill Factory CLI — 小红书技能工厂
 *
 * 主入口: rfs <command> [options]
 */
import { Command } from "commander";
import { createInitCommand } from "./commands/init.js";
import { createValidateCommand } from "./commands/validate.js";
import { createListCommand } from "./commands/list.js";
import { createTestCommand } from "./commands/test.js";
import { createBuildCommand } from "./commands/build.js";
import { createMarketCommand } from "./commands/market.js";
import { createTrendingCommand } from "./commands/trending.js";

const program = new Command();

program
  .name("rfs")
  .description("小红书技能工厂 — 快速制作、测试、打包 RedSkill")
  .version("0.1.0")
  .addCommand(createInitCommand())
  .addCommand(createValidateCommand())
  .addCommand(createTestCommand())
  .addCommand(createBuildCommand())
  .addCommand(createMarketCommand())
  .addCommand(createListCommand())
  .addCommand(createTrendingCommand())
  ;

program.parse();
