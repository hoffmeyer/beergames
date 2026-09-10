import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { TeamsPage } from "./pages/TeamsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";

function BottomNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 flex-1 items-center justify-center text-sm font-medium ${
      isActive ? "text-blue-600" : "text-gray-500"
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 bg-white">
      <NavLink to="/" end className={linkClass}>
        Teams
      </NavLink>
      <NavLink to="/schedule" className={linkClass}>
        Schedule
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
      <div className="min-h-screen bg-gray-50 pb-16">
        <Routes>
          <Route path="/" element={<TeamsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
