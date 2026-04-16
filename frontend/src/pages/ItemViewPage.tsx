import { useEffect, useState } from 'react';
import { Descriptions, Card, Typography, Button, Image, Space, Tag, Table, Spin } from 'antd';
import { EditOutlined, ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;

export default function ItemViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    api.get(`/items/${id}`).then((res) => setItem(res.data));
  }, [id]);

  const loadHistory = () => {
    api.get(`/items/${id}/history`).then((res) => setHistory(res.data));
    setShowHistory(true);
  };

  if (!item) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const canEdit = user?.role === 'admin' || user?.role === 'keeper' || user?.role === 'researcher';

  const historyColumns = [
    { title: 'Поле', dataIndex: 'field_name', key: 'field' },
    { title: 'Было', dataIndex: 'old_value', key: 'old', ellipsis: true },
    { title: 'Стало', dataIndex: 'new_value', key: 'new', ellipsis: true },
    { title: 'Пользователь', key: 'user', render: (_: any, r: any) => r.user?.full_name },
    { title: 'Дата', dataIndex: 'changed_at', key: 'date', render: (v: string) => new Date(v).toLocaleString('ru-RU') },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/items')}>Назад</Button>
        {canEdit && <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/items/${id}/edit`)}>Редактировать</Button>}
        <Button icon={<HistoryOutlined />} onClick={loadHistory}>История изменений</Button>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>
          {item.name}
          {item.is_deleted && <Tag color="red" style={{ marginLeft: 8 }}>Архив</Tag>}
        </Title>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Инвентарный номер">{item.inventory_number}</Descriptions.Item>
          <Descriptions.Item label="Категория">{item.category?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Материал" span={2}>
            {item.materials?.map((m: any) => <Tag key={m.id}>{m.name}</Tag>) || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Описание" span={2}>{item.description || '—'}</Descriptions.Item>
          <Descriptions.Item label="Техника">{item.technique || '—'}</Descriptions.Item>
          <Descriptions.Item label="Датировка">{item.dating || '—'}</Descriptions.Item>
          <Descriptions.Item label="Размеры (Д×Ш×В)">{`${item.length || '—'} × ${item.width || '—'} × ${item.height || '—'} мм`}</Descriptions.Item>
          <Descriptions.Item label="Масса">{item.weight ? `${item.weight} г` : '—'}</Descriptions.Item>
          <Descriptions.Item label="Место создания">{item.place_of_creation || '—'}</Descriptions.Item>
          <Descriptions.Item label="Автор">{item.author || '—'}</Descriptions.Item>
          <Descriptions.Item label="Способ поступления">{item.acquisition_method?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Источник поступления">{item.acquisition_source || '—'}</Descriptions.Item>
          <Descriptions.Item label="Дата поступления">{item.acquisition_date || '—'}</Descriptions.Item>
          <Descriptions.Item label="Место хранения">{item.storage_location?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Сохранность">{item.condition?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Примечания" span={2}>{item.notes || '—'}</Descriptions.Item>
          <Descriptions.Item label="Создан">{new Date(item.created_at).toLocaleString('ru-RU')}</Descriptions.Item>
          <Descriptions.Item label="Обновлён">{new Date(item.updated_at).toLocaleString('ru-RU')}</Descriptions.Item>
        </Descriptions>
      </Card>

      {item.images?.length > 0 && (
        <Card title="Изображения" style={{ marginBottom: 16 }}>
          <Image.PreviewGroup>
            <Space wrap>
              {item.images.map((img: any) => (
                <Image key={img.id} width={150} height={150} src={`http://localhost:8000${img.file_path}`} style={{ objectFit: 'cover', borderRadius: 4 }} />
              ))}
            </Space>
          </Image.PreviewGroup>
        </Card>
      )}

      {showHistory && (
        <Card title="История изменений">
          <Table dataSource={history} columns={historyColumns} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
        </Card>
      )}
    </div>
  );
}
