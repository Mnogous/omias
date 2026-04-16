import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Администратор' },
  { value: 'keeper', label: 'Хранитель' },
  { value: 'researcher', label: 'Научный сотрудник' },
  { value: 'guest', label: 'Гость' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'red', keeper: 'blue', researcher: 'green', guest: 'default',
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    const res = await api.get('/users/');
    setUsers(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async (values: any) => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, { full_name: values.full_name, email: values.email, role: values.role });
        message.success('Пользователь обновлён');
      } else {
        await api.post('/users/', values);
        message.success('Пользователь создан');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    }
  };

  const toggleActive = async (user: any) => {
    await api.put(`/users/${user.id}`, { is_active: !user.is_active });
    message.success(user.is_active ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
    fetchUsers();
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/users/${id}`);
    message.success('Пользователь удалён');
    fetchUsers();
  };

  const columns = [
    { title: 'Логин', dataIndex: 'username', key: 'username' },
    { title: 'ФИО', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Роль', dataIndex: 'role', key: 'role',
      render: (role: string) => <Tag color={ROLE_COLORS[role]}>{ROLE_OPTIONS.find((r) => r.value === role)?.label}</Tag>,
    },
    {
      title: 'Статус', key: 'status',
      render: (_: any, r: any) => r.is_active ? <Tag color="green">Активен</Tag> : <Tag color="red">Заблокирован</Tag>,
    },
    {
      title: 'Действия', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingUser(r); form.setFieldsValue(r); setModalOpen(true); }} />
          <Button size="small" icon={r.is_active ? <LockOutlined /> : <UnlockOutlined />} onClick={() => toggleActive(r)} />
          <Popconfirm title="Удалить пользователя?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Управление пользователями</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(null); form.resetFields(); setModalOpen(true); }}>
          Добавить
        </Button>
      </div>

      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} />

      <Modal
        title={editingUser ? 'Редактирование' : 'Новый пользователь'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingUser(null); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {!editingUser && (
            <>
              <Form.Item name="username" label="Логин" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 8, message: 'Минимум 8 символов' }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Form.Item name="full_name" label="ФИО" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
