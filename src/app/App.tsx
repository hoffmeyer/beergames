import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { TeamsPage } from "./pages/TeamsPage";
import { BeerlympicsPage } from "./pages/BeerlympicsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { AdminPage } from "./pages/AdminPage";

function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-1 items-center justify-center text-sm font-medium ${
      isActive ? "text-blue-600" : "text-gray-500"
    }`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <NavLink to="/" end className={linkClass}>
        Teams
      </NavLink>
      <NavLink to="/beerlympics" className={linkClass}>
        Beerlympics
      </NavLink>
      <NavLink to="/leaderboard" className={linkClass}>
        Leaderboard
      </NavLink>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div
        className="min-h-screen bg-gray-50"
        style={{ paddingBottom: "calc(2.75rem + 1px + env(safe-area-inset-bottom))" }}
      >
        <Routes>
          <Route path="/" element={<TeamsPage />} />
          <Route path="/beerlympics" element={<BeerlympicsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
