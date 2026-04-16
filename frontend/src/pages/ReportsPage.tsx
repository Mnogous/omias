import { useState, useEffect } from 'react';
import { Card, Button, Select, DatePicker, Typography, Row, Col, Space, message } from 'antd';
import { FilePdfOutlined, FileExcelOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface DictItem { id: number; name: string; }

export default function ReportsPage() {
  const [categories, setCategories] = useState<DictItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    api.get('/dictionaries/categories').then((r) => setCategories(r.data));
  }, []);

  const download = async (url: string, filename: string, key: string) => {
    setLoading(key);
    try {
      const res = await api.get(url, { responseType: 'blob', params: categoryId ? { category_id: categoryId } : {} });
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
      message.info(`Найдено записей: ${res.data.length}`);
    } catch {
      message.error('Ошибка');
    }
    setLoading(null);
  };

  return (
    <div>
      <Title level={4}>Отчёты</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Card title="Инвентарная книга" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select placeholder="Категория (все)" value={categoryId} onChange={setCategoryId} allowClear style={{ width: '100%' }}
                options={categories.map((c) => ({ value: c.id, label: c.name }))} />
              <Button type="primary" icon={<FilePdfOutlined />} block loading={loading === 'inv'}
                onClick={() => download('/reports/inventory-book', 'inventory_book.pdf', 'inv')}>
                Сформировать PDF
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Экспорт каталога" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select placeholder="Категория (все)" value={categoryId} onChange={setCategoryId} allowClear style={{ width: '100%' }}
                options={categories.map((c) => ({ value: c.id, label: c.name }))} />
              <Button icon={<FileExcelOutlined />} block loading={loading === 'csv'}
                onClick={() => download('/reports/export-csv', 'export.csv', 'csv')}>
                Экспорт CSV
              </Button>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Поступления за период" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <RangePicker style={{ width: '100%' }} onChange={(dates) => {
                if (dates && dates[0] && dates[1]) setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                else setDateRange(null);
              }} />
              <Button icon={<FilePdfOutlined />} block loading={loading === 'acq'} onClick={downloadAcquisitions}>
                Показать отчёт
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
