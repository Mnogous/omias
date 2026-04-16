import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Table } from 'antd';
import { DatabaseOutlined, AppstoreOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;

interface Stats {
  total_items: number;
  by_category: { category: string; count: number }[];
}

export default function DashboardPage() {
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
        <Col span={8}>
          <Card>
            <Statistic
              title="Всего предметов"
              value={stats?.total_items || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Категорий"
              value={stats?.by_category?.length || 0}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
      </Row>
      <Card title="Распределение по категориям">
        <Table
          dataSource={stats?.by_category || []}
          columns={columns}
          rowKey="category"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
