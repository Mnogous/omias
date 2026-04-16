import { useState } from 'react';
import { Layout, Menu, Button, Typography, Dropdown, Avatar } from 'antd';
import {
  DatabaseOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  BookOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  keeper: 'Хранитель',
  researcher: 'Научный сотрудник',
  guest: 'Гость',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Главная' },
    { key: '/items', icon: <DatabaseOutlined />, label: 'Каталог' },
  ];

  if (user?.role === 'admin' || user?.role === 'keeper' || user?.role === 'researcher') {
    menuItems.push(
    { key: '/reports', icon: <FileTextOutlined />, label: 'Отчёты' },
    );
  }

  if (user?.role === 'admin') {
    menuItems.push(
      { key: '/dictionaries', icon: <BookOutlined />, label: 'Справочники' },
      { key: '/users', icon: <UserOutlined />, label: 'Пользователи' },
      { key: '/audit', icon: <AuditOutlined />, label: 'Журнал' },
    );
  }

  const userMenuItems = [
    { key: 'profile', icon: <SettingOutlined />, label: 'Сменить пароль', onClick: () => navigate('/change-password') },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', onClick: logout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Text strong style={{ color: '#fff', fontSize: collapsed ? 14 : 18 }}>
            {collapsed ? 'О' : 'ОМИАС'}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.full_name}</span>
              <Text type="secondary" style={{ fontSize: 12 }}>({ROLE_LABELS[user?.role || '']})</Text>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
