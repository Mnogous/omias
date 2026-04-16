import { useEffect, useState } from 'react';
import { Form, Input, Select, DatePicker, InputNumber, Button, Card, Typography, message, Upload, Image, Space, Popconfirm, Row, Col } from 'antd';
import { UploadOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api/client';

const { Title } = Typography;
const { TextArea } = Input;

interface DictItem { id: number; name: string; }

export default function ItemFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<DictItem[]>([]);
  const [materials, setMaterials] = useState<DictItem[]>([]);
  const [locations, setLocations] = useState<DictItem[]>([]);
  const [conditions, setConditions] = useState<DictItem[]>([]);
  const [methods, setMethods] = useState<DictItem[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const isEdit = id && id !== 'new';

  useEffect(() => {
    Promise.all([
      api.get('/dictionaries/categories'),
      api.get('/dictionaries/materials'),
      api.get('/dictionaries/storage_locations'),
      api.get('/dictionaries/conditions'),
      api.get('/dictionaries/acquisition_methods'),
    ]).then(([c, m, l, co, am]) => {
      setCategories(c.data);
      setMaterials(m.data);
      setLocations(l.data);
      setConditions(co.data);
      setMethods(am.data);
    });

    if (isEdit) {
      api.get(`/items/${id}`).then((res) => {
        const d = res.data;
        form.setFieldsValue({
          ...d,
          category_id: d.category?.id,
          storage_location_id: d.storage_location?.id,
          condition_id: d.condition?.id,
          acquisition_method_id: d.acquisition_method?.id,
          material_ids: d.materials?.map((m: DictItem) => m.id) || [],
          acquisition_date: d.acquisition_date ? dayjs(d.acquisition_date) : null,
        });
        setImages(d.images || []);
      });
    }
  }, [id]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = {
        ...values,
        acquisition_date: values.acquisition_date?.format('YYYY-MM-DD') || null,
      };
      if (isEdit) {
        await api.put(`/items/${id}`, data);
        message.success('Предмет обновлён');
      } else {
        const res = await api.post('/items/', data);
        message.success(`Предмет создан: ${res.data.inventory_number}`);
        navigate(`/items/${res.data.id}`);
        return;
      }
      navigate(`/items/${id}`);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/items/${id}/images`, formData);
      setImages((prev) => [...prev, { id: res.data.id, file_path: res.data.file_path }]);
      message.success('Изображение загружено');
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка загрузки');
    }
    return false;
  };

  const handleDeleteImage = async (imageId: number) => {
    await api.delete(`/items/${id}/images/${imageId}`);
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    message.success('Изображение удалено');
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Назад
      </Button>
      <Title level={4}>{isEdit ? 'Редактирование предмета' : 'Новый предмет'}</Title>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={16}>
          <Col span={16}>
            <Card title="Основные сведения" size="small" style={{ marginBottom: 16 }}>
              <Form.Item name="name" label="Наименование" rules={[{ required: true, message: 'Обязательное поле' }]}>
                <Input />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="category_id" label="Категория">
                    <Select allowClear options={categories.map((c) => ({ value: c.id, label: c.name }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="material_ids" label="Материал">
                    <Select mode="multiple" allowClear options={materials.map((m) => ({ value: m.id, label: m.name }))} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Описание">
                <TextArea rows={4} maxLength={10000} showCount />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="technique" label="Техника изготовления">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="dating" label="Датировка">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="length" label="Длина (мм)">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="width" label="Ширина (мм)">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="height" label="Высота (мм)">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="weight" label="Масса (г)">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="place_of_creation" label="Место создания">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="author" label="Автор / изготовитель">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="notes" label="Примечания">
                <TextArea rows={2} />
              </Form.Item>
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Учётные данные" size="small" style={{ marginBottom: 16 }}>
              <Form.Item name="acquisition_method_id" label="Способ поступления">
                <Select allowClear options={methods.map((m) => ({ value: m.id, label: m.name }))} />
              </Form.Item>
              <Form.Item name="acquisition_source" label="Источник поступления">
                <Input />
              </Form.Item>
              <Form.Item name="acquisition_date" label="Дата поступления">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="storage_location_id" label="Место хранения">
                <Select allowClear options={locations.map((l) => ({ value: l.id, label: l.name }))} />
              </Form.Item>
              <Form.Item name="condition_id" label="Состояние сохранности">
                <Select allowClear options={conditions.map((c) => ({ value: c.id, label: c.name }))} />
              </Form.Item>
            </Card>

            {isEdit && (
              <Card title="Изображения" size="small" style={{ marginBottom: 16 }}>
                <Space wrap>
                  {images.map((img) => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <Image width={80} height={80} src={`http://localhost:8000${img.file_path}`} style={{ objectFit: 'cover', borderRadius: 4 }} />
                      <Popconfirm title="Удалить?" onConfirm={() => handleDeleteImage(img.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} style={{ position: 'absolute', top: 0, right: 0 }} />
                      </Popconfirm>
                    </div>
                  ))}
                </Space>
                <Upload beforeUpload={handleUpload} showUploadList={false} accept=".jpg,.jpeg,.png,.webp">
                  <Button icon={<UploadOutlined />} style={{ marginTop: 8 }} block>Загрузить</Button>
                </Upload>
              </Card>
            )}
          </Col>
        </Row>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
            <Button onClick={() => navigate(-1)}>Отмена</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
