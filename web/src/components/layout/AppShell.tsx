import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: "var(--sidebar-width)" }}>
        <Header />
        <main style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
