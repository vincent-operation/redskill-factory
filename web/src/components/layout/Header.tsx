export function Header() {
  return (
    <header style={{
      height: "var(--header-height)",
      background: "var(--color-surface)",
      borderBottom: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div>
        <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          📡 API: localhost:3001
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a
          href="/api/v1/health"
          target="_blank"
          style={{ fontSize: 13, color: "var(--color-primary)" }}
        >
          Health Check
        </a>
      </div>
    </header>
  );
}
