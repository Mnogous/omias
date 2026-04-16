import { Form, Input, Button, Card, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const { Title } = Typography;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values: { old_password: string; new_password: string }) => {
    try {
      await api.post('/auth/change-password', values);
      message.success('Пароль успешно изменён');
      navigate('/');
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'Ошибка');
    }
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <Title level={4}>Смена пароля</Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="old_password" label="Текущий пароль" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="new_password" label="Новый пароль" rules={[{ required: true, min: 8, message: 'Минимум 8 символов, буквы и цифры' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Сменить пароль</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
