import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

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
  const { user: currentUser } = useAuth();
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

  const toggleActive = async (u: any) => {
    try {
      await api.put(`/users/${u.id}`, { is_active: !u.is_active });
      message.success(u.is_active ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('Пользователь удалён');
      fetchUsers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    }
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
      render: (_: any, r: any) => {
        const isSelf = r.username === currentUser?.username;
        return (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditingUser(r); form.setFieldsValue(r); setModalOpen(true); }} />
            {!isSelf && (
              <Button size="small" icon={r.is_active ? <LockOutlined /> : <UnlockOutlined />} onClick={() => toggleActive(r)} />
            )}
            {!isSelf && (
              <Popconfirm title="Удалить пользователя?" okText="Да" cancelText="Отмена" onConfirm={() => handleDelete(r.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        );
      },
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

      <Table dataSource={users} columns={columns} rowKey="id" loading={loading}
        pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '25', '50'], showTotal: (t: number) => `Всего: ${t}` }} />

      <Modal
        title={editingUser ? 'Редактирование' : 'Новый пользователь'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingUser(null); }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {!editingUser && (
            <>
              <Form.Item name="username" label="Логин" rules={[{ required: true, message: 'Введите логин' }, { min: 3, message: 'Логин должен содержать не менее 3 символов' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введите пароль' }, { min: 8, message: 'Пароль должен содержать не менее 8 символов' }]}>
                <Input.Password />
              </Form.Item>
            </>
          )}
          <Form.Item name="full_name" label="ФИО" rules={[{ required: true, message: 'Введите ФИО' }, { min: 2, message: 'ФИО должно содержать не менее 2 символов' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Введите email' }, { type: 'email', message: 'Введите корректный email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true, message: 'Выберите роль' }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
