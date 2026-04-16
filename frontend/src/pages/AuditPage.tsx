import { useEffect, useState } from 'react';
import { Table, Select, DatePicker, Typography, Row, Col, Card } from 'antd';
import api from '../api/client';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ACTION_LABELS: Record<string, string> = {
  login: 'Вход', create: 'Создание', update: 'Обновление', delete: 'Удаление',
  restore: 'Восстановление', upload_image: 'Загрузка изображения', delete_image: 'Удаление изображения',
  change_password: 'Смена пароля',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [filterUser, setFilterUser] = useState<number | undefined>();
  const [filterAction, setFilterAction] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  useEffect(() => { api.get('/users/').then((r) => setUsers(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { page, per_page: 50 };
    if (filterUser) params.user_id = filterUser;
    if (filterAction) params.action = filterAction;
    if (dateRange) { params.date_from = dateRange[0]; params.date_to = dateRange[1]; }
    api.get('/audit/', { params }).then((res) => {
      setEntries(res.data.entries);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  }, [page, filterUser, filterAction, dateRange]);

  const columns = [
    { title: 'Дата', key: 'date', width: 160, render: (_: any, r: any) => new Date(r.created_at).toLocaleString('ru-RU') },
    { title: 'Пользователь', key: 'user', width: 180, render: (_: any, r: any) => r.user?.full_name || '—' },
    { title: 'Действие', key: 'action', width: 140, render: (_: any, r: any) => ACTION_LABELS[r.action] || r.action },
    { title: 'Объект', dataIndex: 'entity_type', key: 'entity', width: 100 },
    { title: 'Подробности', dataIndex: 'details', key: 'details', ellipsis: true },
  ];

  return (
    <div>
      <Title level={4}>Журнал действий</Title>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col span={6}>
            <Select placeholder="Пользователь" value={filterUser} onChange={setFilterUser} allowClear style={{ width: '100%' }}
              options={users.map((u: any) => ({ value: u.id, label: u.full_name }))} />
          </Col>
          <Col span={6}>
            <Select placeholder="Действие" value={filterAction} onChange={setFilterAction} allowClear style={{ width: '100%' }}
              options={Object.entries(ACTION_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          </Col>
          <Col span={6}>
            <RangePicker style={{ width: '100%' }} onChange={(dates) => {
              if (dates && dates[0] && dates[1]) setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
              else setDateRange(null);
            }} />
          </Col>
        </Row>
      </Card>
      <Table dataSource={entries} columns={columns} rowKey="id" loading={loading} size="small"
        pagination={{ current: page, pageSize: 50, total, onChange: setPage, showTotal: (t) => `Всего: ${t}` }} />
    </div>
  );
}
