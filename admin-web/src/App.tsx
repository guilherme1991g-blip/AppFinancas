import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import UserDetail from './pages/UserDetail';
import TransactionMonitor from './pages/TransactionMonitor';
import Login from './pages/Login';

function App() {
  const isAuthenticated = !!localStorage.getItem('admin_token');

  return (
    <BrowserRouter basename="/dev-admin">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="transactions" element={<TransactionMonitor />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
