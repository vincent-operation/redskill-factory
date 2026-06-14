import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { SkillEditorPage } from "./pages/SkillEditorPage.js";
import { SkillTesterPage } from "./pages/SkillTesterPage.js";
import { BuildPage } from "./pages/BuildPage.js";
import { MarketPage } from "./pages/MarketPage.js";
import { TemplatesPage } from "./pages/TemplatesPage.js";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/skills/new" element={<SkillEditorPage />} />
        <Route path="/skills/:name/edit" element={<SkillEditorPage />} />
        <Route path="/skills/:name/test" element={<SkillTesterPage />} />
        <Route path="/skills/:name/build" element={<BuildPage />} />
        <Route path="/skills/:name/market" element={<MarketPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
      </Routes>
    </AppShell>
  );
}
