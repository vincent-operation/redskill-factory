/**
 * License System — 技能授权与验证
 *
 * 实现付费技能的 license key 生成、验证和嵌入机制。
 * 使技能可以被售卖而非随意复制。
 */
import { createHash, randomUUID } from "node:crypto";

export interface LicenseKey {
  /** 许可证密钥 (分发给购买者) */
  key: string;
  /** 技能标识 */
  skillName: string;
  /** 购买者标识 */
  buyerId: string;
  /** 签发时间 */
  issuedAt: string;
  /** 过期时间 (null = 永久) */
  expiresAt: string | null;
  /** 签名 (防篡改) */
  signature: string;
}

/**
 * 生成 license key
 */
export function generateLicense(skillName: string, buyerId: string): LicenseKey {
  const key = `RSK-${randomUUID().slice(0, 8).toUpperCase()}`;
  const issuedAt = new Date().toISOString();
  const data = `${skillName}:${buyerId}:${key}:${issuedAt}`;
  const signature = createHash("sha256").update(data).digest("hex").slice(0, 16);

  return {
    key,
    skillName,
    buyerId,
    issuedAt,
    expiresAt: null,
    signature,
  };
}

/**
 * 验证 license key 是否有效
 */
export function verifyLicense(license: LicenseKey): { valid: boolean; reason?: string } {
  // 验证签名
  const data = `${license.skillName}:${license.buyerId}:${license.key}:${license.issuedAt}`;
  const expectedSig = createHash("sha256").update(data).digest("hex").slice(0, 16);

  if (license.signature !== expectedSig) {
    return { valid: false, reason: "Invalid signature — license may be tampered" };
  }

  // 验证过期
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return { valid: false, reason: "License has expired" };
  }

  return { valid: true };
}

/**
 * 生成嵌入到打包产物中的 license 验证代码片段
 */
export function generateLicenseGuard(license: LicenseKey): string {
  const json = JSON.stringify(license);
  return [
    "<!-- LICENSE VERIFICATION -- DO NOT REMOVE -->",
    "<!-- This skill is protected by RedSkill License -->",
    `<!-- LICENSE: ${json} -->`,
    "<!-- To purchase: https://redskill.store -->",
  ].join("\n");
}

/**
 * 生成 license 文件内容
 */
export function generateLicenseFile(license: LicenseKey): string {
  return [
    "============================================",
    "  RedSkill Factory — 技能许可证",
    "============================================",
    "",
    `  技能: ${license.skillName}`,
    `  密钥: ${license.key}`,
    `  购买者: ${license.buyerId}`,
    `  签发日期: ${license.issuedAt}`,
    `  过期时间: ${license.expiresAt ?? "永久有效"}`,
    "",
    "  签名: " + license.signature,
    "",
    "  使用方法:",
    "  将此许可证文件放在技能目录中即可激活。",
    "  禁止分享、转售本许可证。",
    "============================================",
  ].join("\n");
}
