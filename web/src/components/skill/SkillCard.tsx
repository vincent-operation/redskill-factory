import type { SkillSummary } from "../../hooks/useSkills.js";

interface Props {
  skill: SkillSummary;
  onClick: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  education: "📚 教育", productivity: "⚡ 效率", creative: "🎨 创意", lifestyle: "🌟 生活",
};

export function SkillCard({ skill, onClick }: Props) {
  return (
    <div className="card" style={{ cursor: "pointer" }} onClick={onClick}>
      <div className="flex-between">
        <span className="badge">{CATEGORY_LABELS[skill.category] ?? skill.category}</span>
        {skill.price && <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>¥{skill.price.amount}</span>}
      </div>
      <h3 style={{ marginTop: 8 }}>{skill.title}</h3>
      <p className="text-secondary text-sm" style={{ marginTop: 4 }}>{skill.description}</p>
    </div>
  );
}
