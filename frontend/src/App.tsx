import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavBar } from './components/NavBar';
import { VerifyPage } from './pages/VerifyPage';
import { ManufacturerPage } from './pages/ManufacturerPage';
import { RegulatorPage } from './pages/RegulatorPage';
import { LoginPage } from './pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login — no navbar */}
        <Route path="/login" element={<LoginPage />} />

        {/* All other routes with navbar */}
        <Route path="/*" element={
          <>
            <NavBar />
            <Routes>
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/verify/:unitId" element={<VerifyPage />} />
              <Route path="/manufacturer" element={<ManufacturerPage />} />
              <Route path="/regulator" element={<RegulatorPage />} />
              <Route path="/" element={<Navigate to="/verify" replace />} />
            </Routes>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
