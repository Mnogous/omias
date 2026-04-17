import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Timeline } from 'antd';
import { DatabaseOutlined, AppstoreOutlined, UserOutlined, PlusCircleOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;

const ACTION_LABELS: Record<string, string> = {
  login: 'Вход', create: 'Создание', update: 'Обновление', delete: 'Удаление',
  restore: 'Восстановление', upload_image: 'Загрузка изображения', delete_image: 'Удаление изображения',
  change_password: 'Смена пароля',
};

interface Stats {
  total_items: number;
  by_category: { category: string; count: number }[];
  recent_items_count: number;
  total_users?: number;
  recent_actions?: { id: number; user: string; action: string; details: string; created_at: string }[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/reports/statistics').then((res) => setStats(res.data));
  }, []);

  const columns = [
    { title: 'Категория', dataIndex: 'category', key: 'category' },
    { title: 'Количество', dataIndex: 'count', key: 'count', width: 120 },
  ];

  return (
    <div>
      <Title level={4}>Главная</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего предметов"
              value={stats?.total_items || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Категорий"
              value={stats?.by_category?.length || 0}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        {user?.role === 'admin' && stats?.total_users !== undefined && (
          <Col span={6}>
            <Card>
              <Statistic
                title="Пользователей"
                value={stats.total_users}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        )}
        <Col span={6}>
          <Card>
            <Statistic
              title="Добавлено за неделю"
              value={stats?.recent_items_count || 0}
              prefix={<PlusCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={user?.role === 'admin' && stats?.recent_actions ? 12 : 24}>
          <Card title="Распределение по категориям">
            <Table
              dataSource={stats?.by_category || []}
              columns={columns}
              rowKey="category"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        {user?.role === 'admin' && stats?.recent_actions && (
          <Col span={12}>
            <Card title="Последние действия">
              <Timeline
                items={stats.recent_actions.map((a) => ({
                  children: (
                    <span>
                      <strong>{a.user}</strong>: {ACTION_LABELS[a.action] || a.action}
                      {a.details ? ` — ${a.details}` : ''}
                      <br />
                      <small style={{ color: '#999' }}>{new Date(a.created_at).toLocaleString('ru-RU')}</small>
                    </span>
                  ),
                }))}
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
