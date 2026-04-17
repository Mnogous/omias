import { useEffect, useState, useCallback, useRef } from 'react';
import { Table, Button, Input, Select, Space, Tag, Typography, message, Popconfirm, DatePicker, Row, Col, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UndoOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface DictItem {
  id: number;
  name: string;
}

export default function ItemsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [locationId, setLocationId] = useState<number | undefined>();
  const [conditionId, setConditionId] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [categories, setCategories] = useState<DictItem[]>([]);
  const [locations, setLocations] = useState<DictItem[]>([]);
  const [conditions, setConditions] = useState<DictItem[]>([]);

  useEffect(() => {
    api.get('/dictionaries/categories').then((r) => setCategories(r.data));
    api.get('/dictionaries/storage_locations').then((r) => setLocations(r.data));
    api.get('/dictionaries/conditions').then((r) => setConditions(r.data));
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { page, per_page: perPage, show_deleted: showDeleted, sort_by: sortBy, sort_order: sortOrder };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      if (locationId) params.storage_location_id = locationId;
      if (conditionId) params.condition_id = conditionId;
      if (dateRange) {
        params.date_from = dateRange[0];
        params.date_to = dateRange[1];
      }
      const res = await api.get('/items/', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, categoryId, locationId, conditionId, dateRange, showDeleted, sortBy, sortOrder]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: number) => {
    await api.delete(`/items/${id}`);
    message.success('Предмет перемещён в архив');
    fetchItems();
  };

  const handleRestore = async (id: number) => {
    await api.post(`/items/${id}/restore`);
    message.success('Предмет восстановлен');
    fetchItems();
  };

  const canEdit = user?.role === 'admin' || user?.role === 'keeper' || user?.role === 'researcher';
  const canDelete = user?.role === 'admin' || user?.role === 'keeper';

  const columns = [
    { title: 'Инв. №', dataIndex: 'inventory_number', key: 'inv', width: 120, sorter: true },
    { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true, sorter: true },
    {
      title: 'Категория', key: 'category', width: 150,
      render: (_: unknown, r: Record<string, any>) => r.category?.name || '—',
    },
    {
      title: 'Место хранения', key: 'location', width: 160,
      render: (_: unknown, r: Record<string, any>) => r.storage_location?.name || '—',
    },
    {
      title: 'Сохранность', key: 'condition', width: 140,
      render: (_: unknown, r: Record<string, any>) => r.condition?.name || '—',
    },
    {
      title: 'Дата пост.', key: 'date', width: 110, sorter: true,
      render: (_: unknown, r: Record<string, any>) => r.acquisition_date || '—',
    },
    {
      title: 'Статус', key: 'status', width: 90,
      render: (_: unknown, r: Record<string, any>) =>
        r.is_deleted ? <Tag color="red">Архив</Tag> : <Tag color="green">Актив</Tag>,
    },
    {
      title: 'Действия', key: 'actions', width: 140, fixed: 'right' as const,
      render: (_: unknown, r: Record<string, any>) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/items/${r.id}`)} />
          {canEdit && (
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/items/${r.id}/edit`)} />
          )}
          {canDelete && !r.is_deleted && (
            <Popconfirm title="Переместить в архив?" okText="Да" cancelText="Отмена" onConfirm={() => handleDelete(r.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
          {user?.role === 'admin' && r.is_deleted && (
            <Button size="small" icon={<UndoOutlined />} onClick={() => handleRestore(r.id)} />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Каталог музейных предметов</Title>
        {canDelete && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/items/new')}>
            Добавить предмет
          </Button>
        )}
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col span={6}>
            <Input
              placeholder="Поиск (от 3 символов)..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value;
                setSearchInput(val);
                clearTimeout(searchTimer.current);
                searchTimer.current = setTimeout(() => {
                  setSearch(val.length >= 3 ? val : '');
                  setPage(1);
                }, 300);
              }}
              allowClear
              onClear={() => { setSearchInput(''); setSearch(''); setPage(1); }}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Категория"
              value={categoryId}
              onChange={(v) => { setCategoryId(v); setPage(1); }}
              allowClear
              style={{ width: '100%' }}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Место хранения"
              value={locationId}
              onChange={(v) => { setLocationId(v); setPage(1); }}
              allowClear
              style={{ width: '100%' }}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Сохранность"
              value={conditionId}
              onChange={(v) => { setConditionId(v); setPage(1); }}
              allowClear
              style={{ width: '100%' }}
              options={conditions.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Col>
          <Col span={4}>
            <RangePicker
              placeholder={['Начало', 'Конец']}
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                } else {
                  setDateRange(null);
                }
                setPage(1);
              }}
            />
          </Col>
          <Col span={2}>
            <Button
              type={showDeleted ? 'primary' : 'default'}
              onClick={() => { setShowDeleted(!showDeleted); setPage(1); }}
              block
            >
              Архив
            </Button>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        locale={{ emptyText: 'Предметы не найдены' }}
        onChange={(_pagination, _filters, sorter: any) => {
          if (sorter && sorter.column) {
            const fieldMap: Record<string, string> = { inv: 'inventory_number', name: 'name', date: 'acquisition_date' };
            setSortBy(fieldMap[sorter.columnKey] || 'id');
            setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
          } else {
            setSortBy('id');
            setSortOrder('desc');
          }
          setPage(1);
        }}
        pagination={{
          current: page,
          pageSize: perPage,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          onChange: (p, ps) => { setPage(p); setPerPage(ps); },
          showTotal: (t) => `Всего: ${t}`,
        }}
      />
    </div>
  );
}
