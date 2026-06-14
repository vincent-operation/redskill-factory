import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { SkillEditorPage } from "./pages/SkillEditorPage.js";
import { SkillTesterPage } from "./pages/SkillTesterPage.js";
import { BuildPage } from "./pages/BuildPage.js";
import { MarketPage } from "./pages/MarketPage.js";
import { TemplatesPage } from "./pages/TemplatesPage.js";
import { StorePage } from "./pages/StorePage.js";
import { SellerPage } from "./pages/SellerPage.js";
import { SkillLandingPage } from "./pages/SkillLandingPage.js";

export function App() {
  return (
    <>
      <Routes>
        {/* Public landing pages — standalone, no sidebar, shareable */}
        <Route path="/skill/:name" element={<SkillLandingPage />} />
      </Routes>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/seller" element={<SellerPage />} />
          <Route path="/skills/new" element={<SkillEditorPage />} />
          <Route path="/skills/:name/edit" element={<SkillEditorPage />} />
          <Route path="/skills/:name/test" element={<SkillTesterPage />} />
          <Route path="/skills/:name/build" element={<BuildPage />} />
          <Route path="/skills/:name/market" element={<MarketPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Routes>
      </AppShell>
    </>
  );
}
