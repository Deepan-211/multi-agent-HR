import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import NewAuditPage from './pages/NewAuditPage';
import SwarmPage from './pages/SwarmPage';
import ResultsPage from './pages/ResultsPage';
import EquityPage from './pages/EquityPage';
import HitlQueuePage from './pages/HitlQueuePage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Dashboard Layout wraps all internal pages */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/audit/new" element={<NewAuditPage />} />
          <Route path="/audit/swarm" element={<SwarmPage />} />
          <Route path="/audit/results" element={<ResultsPage />} />
          <Route path="/equity" element={<EquityPage />} />
          <Route path="/hitl" element={<HitlQueuePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
