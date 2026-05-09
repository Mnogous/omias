import { useEffect, useState } from 'react';
import { Descriptions, Card, Typography, Button, Image, Space, Tag, Table, Spin } from 'antd';
import { EditOutlined, ArrowLeftOutlined, HistoryOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../utils/date';

const { Title } = Typography;

const PRE_WRAP: React.CSSProperties = { whiteSpace: 'pre-wrap' };

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

  const isGuest = user?.role === 'guest';
  const canEdit = user?.role === 'admin' || user?.role === 'keeper' || user?.role === 'researcher';

  const FIELD_LABELS: Record<string, string> = {
    name: 'Наименование', description: 'Описание', technique: 'Техника', dating: 'Датировка',
    length: 'Длина', width: 'Ширина', height: 'Высота', depth: 'Глубина', weight: 'Масса', quantity: 'Количество',
    place_of_creation: 'Место создания', author: 'Автор', notes: 'Примечания',
    category_id: 'Категория', fond_id: 'Фонд', fond_number: '№ в фонде',
    storage_place_id: 'Место хранения', storage_location: 'Место размещения', condition_id: 'Сохранность',
    condition_notes: 'Расшифровка состояния',
    acquisition_method_id: 'Способ поступления', acquisition_source: 'Источник поступления',
    acquisition_date: 'Дата поступления', is_deleted: 'Статус (архив)',
    inventory_number: 'Инвентарный номер',
    material_ids: 'Материал',
    image_added: 'Добавлено изображение', image_removed: 'Удалено изображение',
  };

  const formatHistoryValue = (field: string, value: string | null) => {
    if (value === null || value === undefined || value === '') return '—';
    if (field === 'acquisition_date') return formatDate(value);
    if (field === 'is_deleted') {
      if (value === 'true') return 'В архиве';
      if (value === 'false') return 'Активный';
    }
    return value;
  };

  const historyColumns = [
    { title: 'Поле', dataIndex: 'field_name', key: 'field', render: (v: string) => FIELD_LABELS[v] || v },
    { title: 'Было', dataIndex: 'old_value', key: 'old', ellipsis: true,
      render: (v: string | null, r: any) => formatHistoryValue(r.field_name, v) },
    { title: 'Стало', dataIndex: 'new_value', key: 'new', ellipsis: true,
      render: (v: string | null, r: any) => formatHistoryValue(r.field_name, v) },
    { title: 'Пользователь', key: 'user', render: (_: any, r: any) => r.user?.full_name },
    { title: 'Дата', dataIndex: 'changed_at', key: 'date', render: (v: string) => formatDateTime(v) },
  ];

  const dimensionsLabel = `${item.length || '—'} × ${item.width || '—'} × ${item.height || '—'} × ${item.depth || '—'} мм`;

  const guestImageProps = isGuest
    ? {
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        draggable: false,
        style: { objectFit: 'cover' as const, borderRadius: 4, userSelect: 'none' as const, WebkitUserSelect: 'none' as const, pointerEvents: 'auto' as const },
      }
    : { style: { objectFit: 'cover' as const, borderRadius: 4 } };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/items')}>Назад</Button>
        {canEdit && <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/items/${id}/edit`)}>Редактировать</Button>}
        {!isGuest && <Button icon={<HistoryOutlined />} onClick={loadHistory}>История изменений</Button>}
        {!isGuest && (
          <Button icon={<FilePdfOutlined />} onClick={() => {
            api.get(`/reports/item-card/${id}`, { responseType: 'blob' }).then((res) => {
              const link = document.createElement('a');
              link.href = URL.createObjectURL(res.data);
              link.download = `item_${id}.pdf`;
              link.click();
              URL.revokeObjectURL(link.href);
            });
          }}>Скачать PDF</Button>
        )}
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Title level={4}>
          {item.name}
          {item.is_deleted && !isGuest && <Tag color="red" style={{ marginLeft: 8 }}>Архив</Tag>}
        </Title>
        <Descriptions bordered column={2} size="small">
          {!isGuest && <Descriptions.Item label="Инвентарный номер">{item.inventory_number}</Descriptions.Item>}
          {!isGuest && <Descriptions.Item label="Количество">{item.quantity ?? 1}</Descriptions.Item>}
          {!isGuest && <Descriptions.Item label="Фонд">{item.fond ? `${item.fond.name} (${item.fond.code})` : '—'}</Descriptions.Item>}
          {!isGuest && <Descriptions.Item label="№ в фонде">{item.fond_number || '—'}</Descriptions.Item>}
          <Descriptions.Item label="Категория">{item.category?.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Материал">
            {item.materials?.length ? item.materials.map((m: any) => <Tag key={m.id}>{m.name}</Tag>) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Описание" span={2}>
            <div style={PRE_WRAP}>{item.description || '—'}</div>
          </Descriptions.Item>
          <Descriptions.Item label="Техника">{item.technique || '—'}</Descriptions.Item>
          <Descriptions.Item label="Датировка">{item.dating || '—'}</Descriptions.Item>
          <Descriptions.Item label="Размеры (Д×Ш×В×Гл)">{dimensionsLabel}</Descriptions.Item>
          <Descriptions.Item label="Масса">{item.weight ? `${item.weight} г` : '—'}</Descriptions.Item>
          <Descriptions.Item label="Место создания">{item.place_of_creation || '—'}</Descriptions.Item>
          <Descriptions.Item label="Автор">{item.author || '—'}</Descriptions.Item>
          {!isGuest && <Descriptions.Item label="Способ поступления">{item.acquisition_method?.name || '—'}</Descriptions.Item>}
          {!isGuest && <Descriptions.Item label="Источник поступления">{item.acquisition_source || '—'}</Descriptions.Item>}
          {!isGuest && <Descriptions.Item label="Дата поступления">{formatDate(item.acquisition_date)}</Descriptions.Item>}
          {!isGuest && <Descriptions.Item label="Место хранения">{item.storage_place?.name || '—'}</Descriptions.Item>}
          {!isGuest && <Descriptions.Item label="Место размещения">{item.storage_location || '—'}</Descriptions.Item>}
          <Descriptions.Item label="Сохранность">{item.condition?.name || '—'}</Descriptions.Item>
          {!isGuest && (
            <Descriptions.Item label="Расшифровка состояния" span={2}>
              <div style={PRE_WRAP}>{item.condition_notes || '—'}</div>
            </Descriptions.Item>
          )}
          {!isGuest && (
            <Descriptions.Item label="Примечания" span={2}>
              <div style={PRE_WRAP}>{item.notes || '—'}</div>
            </Descriptions.Item>
          )}
          {!isGuest && <Descriptions.Item label="Создан">{formatDateTime(item.created_at)}</Descriptions.Item>}
          {!isGuest && <Descriptions.Item label="Обновлён">{formatDateTime(item.updated_at)}</Descriptions.Item>}
        </Descriptions>
      </Card>

      {item.images?.length > 0 && (
        <Card title="Изображения" style={{ marginBottom: 16 }}>
          <Image.PreviewGroup>
            <Space wrap onContextMenu={isGuest ? (e) => e.preventDefault() : undefined}>
              {item.images.map((img: any) => (
                <Image
                  key={img.id}
                  width={150}
                  height={150}
                  src={`http://localhost:8000${img.file_path}`}
                  {...guestImageProps}
                  preview={isGuest ? { toolbarRender: () => null } : undefined}
                />
              ))}
            </Space>
          </Image.PreviewGroup>
        </Card>
      )}

      {showHistory && !isGuest && (
        <Card title="История изменений">
          <Table dataSource={history} columns={historyColumns} rowKey="id" size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'], showTotal: (t: number) => `Всего: ${t}` }} />
        </Card>
      )}
    </div>
  );
}
