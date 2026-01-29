import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route Default: Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Route Aplikasi: Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Fallback: Jika halaman tidak ditemukan, balik ke Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;