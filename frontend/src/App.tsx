import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ItemsPage from './pages/ItemsPage';
import ItemFormPage from './pages/ItemFormPage';
import ItemViewPage from './pages/ItemViewPage';
import UsersPage from './pages/UsersPage';
import DictionariesPage from './pages/DictionariesPage';
import AuditPage from './pages/AuditPage';
import ReportsPage from './pages/ReportsPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Spin size="large" style={{ display: 'block', margin: '200px auto' }} />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/items" element={<ItemsPage />} />
        <Route path="/items/new" element={<ItemFormPage />} />
        <Route path="/items/:id" element={<ItemViewPage />} />
        <Route path="/items/:id/edit" element={<ItemFormPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/dictionaries" element={<AdminRoute><DictionariesPage /></AdminRoute>} />
        <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
        <Route path="/audit" element={<AdminRoute><AuditPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={ruRU} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
