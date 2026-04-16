import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, message, Popconfirm, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;

const DICT_TYPES = [
  { key: 'categories', label: 'Категории' },
  { key: 'materials', label: 'Материалы' },
  { key: 'storage_locations', label: 'Места хранения' },
  { key: 'conditions', label: 'Состояния сохранности' },
  { key: 'acquisition_methods', label: 'Способы поступления' },
];

export default function DictionariesPage() {
  const [activeTab, setActiveTab] = useState('categories');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = async (type: string) => {
    setLoading(true);
    const res = await api.get(`/dictionaries/${type}`);
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(activeTab); }, [activeTab]);

  const handleSave = async (values: any) => {
    try {
      if (editingItem) {
        await api.put(`/dictionaries/${activeTab}/${editingItem.id}`, values);
        message.success('Обновлено');
      } else {
        await api.post(`/dictionaries/${activeTab}`, values);
        message.success('Добавлено');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingItem(null);
      fetchData(activeTab);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/dictionaries/${activeTab}/${id}`);
      message.success('Удалено');
      fetchData(activeTab);
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    }
  };

  const columns = [
    { title: '№', key: 'index', width: 60, render: (_: any, __: any, i: number) => i + 1 },
    { title: 'Наименование', dataIndex: 'name', key: 'name' },
    {
      title: 'Действия', key: 'actions', width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingItem(r); form.setFieldsValue(r); setModalOpen(true); }} />
          <Popconfirm title="Удалить?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>Справочники</Title>
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k)}
        tabBarExtraContent={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); form.resetFields(); setModalOpen(true); }}>
            Добавить
          </Button>
        }
        items={DICT_TYPES.map((d) => ({
          key: d.key,
          label: d.label,
          children: <Table dataSource={data} columns={columns} rowKey="id" loading={loading} pagination={false} size="small" />,
        }))}
      />

      <Modal
        title={editingItem ? 'Редактирование' : 'Новая запись'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingItem(null); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Наименование" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
