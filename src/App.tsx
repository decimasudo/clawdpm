import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import HowItWorks from './components/HowItWorks';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route Default: Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Route Aplikasi: Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Route: How It Works */}
        <Route path="/how-it-works" element={<HowItWorks />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;