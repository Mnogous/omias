import { useState, useEffect } from 'react';
import { Card, Button, Select, DatePicker, Typography, Row, Col, Space, message, Table } from 'antd';
import { FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import api from '../api/client';
import { DATE_FORMAT, toApiDate } from '../utils/date';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface DictItem { id: number; name: string; }
interface FondItem { id: number; name: string; code: string; }

export default function ReportsPage() {
  const [categories, setCategories] = useState<DictItem[]>([]);
  const [conditions, setConditions] = useState<DictItem[]>([]);
  const [fonds, setFonds] = useState<FondItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [conditionId, setConditionId] = useState<number | undefined>();
  const [fondId, setFondId] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [acquisitions, setAcquisitions] = useState<any[] | null>(null);

  useEffect(() => {
    api.get('/dictionaries/categories').then((r) => setCategories(r.data));
    api.get('/dictionaries/conditions').then((r) => setConditions(r.data));
    api.get('/dictionaries/fonds').then((r) => setFonds(r.data));
  }, []);

  const buildParams = () => {
    const p: Record<string, number> = {};
    if (categoryId) p.category_id = categoryId;
    if (conditionId) p.condition_id = conditionId;
    if (fondId) p.fond_id = fondId;
    return p;
  };

  const download = async (url: string, filename: string, key: string, params?: Record<string, number>) => {
    setLoading(key);
    try {
      const res = await api.get(url, { responseType: 'blob', params: params ?? buildParams() });
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
            <Select placeholder="Фонд (все)" value={fondId} onChange={setFondId} allowClear style={{ width: '100%' }}
              options={fonds.map((f) => ({ value: f.id, label: `${f.name} (${f.code})` }))} />
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={6}>
          <Card title="Инвентарная книга" size="small">
            <Button type="primary" icon={<FilePdfOutlined />} block loading={loading === 'inv'}
              onClick={() => download('/reports/inventory-book', 'inventory_book.pdf', 'inv')}>
              Сформировать PDF
            </Button>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Книга поступлений музейных фондов" size="small">
            <Button type="primary" icon={<FilePdfOutlined />} block loading={loading === 'acqbook'}
              onClick={() => download('/reports/acquisitions-book', 'acquisitions_book.pdf', 'acqbook', fondId ? { fond_id: fondId } : {})}>
              Сформировать PDF
            </Button>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Экспорт каталога" size="small">
            <Button icon={<FileExcelOutlined />} block loading={loading === 'csv'}
              onClick={() => download('/reports/export-csv', 'export.csv', 'csv')}>
              Экспорт CSV
            </Button>
          </Card>
        </Col>
        <Col span={6}>
          <Card title="Поступления за период" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <RangePicker placeholder={['Начало', 'Конец']} format={DATE_FORMAT} style={{ width: '100%' }} onChange={(dates) => {
                if (dates && dates[0] && dates[1]) setDateRange([toApiDate(dates[0])!, toApiDate(dates[1])!]);
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
