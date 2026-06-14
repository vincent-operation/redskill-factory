import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "仪表板", emoji: "📊" },
  { to: "/templates", label: "模板库", emoji: "📦" },
  { to: "/skills/new", label: "创建技能", emoji: "➕" },
];

export function Sidebar() {
  return (
    <aside style={{
      position: "fixed",
      left: 0, top: 0, bottom: 0,
      width: "var(--sidebar-width)",
      background: "#1a1a2e",
      color: "#fff",
      padding: "20px 0",
      overflowY: "auto",
      zIndex: 100,
    }}>
      <div style={{ padding: "0 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
          🏭 RedSkill Factory
        </h2>
        <p style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>小红书技能工厂</p>
      </div>
      <nav>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 20px",
              color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
              background: isActive ? "rgba(255,36,66,0.3)" : "transparent",
              textDecoration: "none",
              fontSize: 14,
              borderLeft: isActive ? "3px solid #ff2442" : "3px solid transparent",
              transition: "all 0.15s",
            })}
          >
            <span>{link.emoji}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, fontSize: 11, opacity: 0.3 }}>
        v0.2.0 · © 2026
      </div>
    </aside>
  );
}
