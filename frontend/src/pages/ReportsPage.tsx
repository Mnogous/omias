import { useState, useEffect } from 'react';
import { Card, Button, Select, DatePicker, Typography, Row, Col, Space, message, Table } from 'antd';
import { FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface DictItem { id: number; name: string; }

export default function ReportsPage() {
  const [categories, setCategories] = useState<DictItem[]>([]);
  const [conditions, setConditions] = useState<DictItem[]>([]);
  const [locations, setLocations] = useState<DictItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [conditionId, setConditionId] = useState<number | undefined>();
  const [locationId, setLocationId] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [acquisitions, setAcquisitions] = useState<any[] | null>(null);

  useEffect(() => {
    api.get('/dictionaries/categories').then((r) => setCategories(r.data));
    api.get('/dictionaries/conditions').then((r) => setConditions(r.data));
    api.get('/dictionaries/storage_locations').then((r) => setLocations(r.data));
  }, []);

  const buildParams = () => {
    const p: Record<string, number> = {};
    if (categoryId) p.category_id = categoryId;
    if (conditionId) p.condition_id = conditionId;
    if (locationId) p.storage_location_id = locationId;
    return p;
  };

  const download = async (url: string, filename: string, key: string) => {
    setLoading(key);
    try {
      const res = await api.get(url, { responseType: 'blob', params: buildParams() });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(res.data);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      message.error('Ошибка генерации отчёта');
    }
    setLoading(null);
  };

  const downloadAcquisitions = async () => {
    if (!dateRange) { message.warning('Укажите период'); return; }
    setLoading('acq');
    try {
      const res = await api.get('/reports/acquisitions', { params: { date_from: dateRange[0], date_to: dateRange[1] } });
      setAcquisitions(res.data);
      message.info(`Найдено записей: ${res.data.length}`);
    } catch {
      message.error('Ошибка');
    }
    setLoading(null);
  };

  const acqColumns = [
    { title: 'Инв. №', dataIndex: 'inventory_number', key: 'inv', width: 120 },
    { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Дата поступления', dataIndex: 'acquisition_date', key: 'date', width: 140 },
    { title: 'Источник', dataIndex: 'acquisition_source', key: 'source', ellipsis: true },
  ];

  return (
    <div>
      <Title level={4}>Отчёты</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12}>
          <Col span={8}>
            <Select placeholder="Категория (все)" value={categoryId} onChange={setCategoryId} allowClear style={{ width: '100%' }}
              options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Col>
          <Col span={8}>
            <Select placeholder="Сохранность (все)" value={conditionId} onChange={setConditionId} allowClear style={{ width: '100%' }}
              options={conditions.map((c) => ({ value: c.id, label: c.name }))} />
          </Col>
          <Col span={8}>
            <Select placeholder="Место хранения (все)" value={locationId} onChange={setLocationId} allowClear style={{ width: '100%' }}
              options={locations.map((l) => ({ value: l.id, label: l.name }))} />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="Инвентарная книга" size="small">
            <Button type="primary" icon={<FilePdfOutlined />} block loading={loading === 'inv'}
              onClick={() => download('/reports/inventory-book', 'inventory_book.pdf', 'inv')}>
              Сформировать PDF
            </Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Экспорт каталога" size="small">
            <Button icon={<FileExcelOutlined />} block loading={loading === 'csv'}
              onClick={() => download('/reports/export-csv', 'export.csv', 'csv')}>
              Экспорт CSV
            </Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Поступления за период" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <RangePicker placeholder={['Начало', 'Конец']} style={{ width: '100%' }} onChange={(dates) => {
                if (dates && dates[0] && dates[1]) setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                else { setDateRange(null); setAcquisitions(null); }
              }} />
              <Button icon={<FilePdfOutlined />} block loading={loading === 'acq'} onClick={downloadAcquisitions}>
                Показать отчёт
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {acquisitions && (
        <Card title={`Поступления за период (${acquisitions.length})`} size="small" style={{ marginTop: 16 }}>
          <Table dataSource={acquisitions} columns={acqColumns} rowKey="id" size="small"
            locale={{ emptyText: 'Нет данных за выбранный период' }}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t: number) => `Всего: ${t}` }} />
        </Card>
      )}
    </div>
  );
}
