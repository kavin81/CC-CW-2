import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SigninPage } from './pages/SigninPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewPastePage } from './pages/NewPastePage';
import { ViewPastePage } from './pages/ViewPastePage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { useAuthStore } from './lib/store';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/signin" />
          }
        />
        <Route path="/signin" element={<SigninPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/new" element={<NewPastePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="/share/:shareId" element={<ViewPastePage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
