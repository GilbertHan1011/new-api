import React, { useEffect, useState } from 'react';
import { Button, Table, Modal, Form, Toast, Popconfirm } from '@douyinfe/semi-ui';
import { API, showError } from '../../../helpers';

const TagManagement = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);

  const loadTags = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/community/tags');
      if (res.data?.success) {
        setTags(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const handleSubmit = async (values) => {
    try {
      const url = editingTag ? `/api/community/admin/tags/${editingTag.id}` : '/api/community/admin/tags';
      const method = editingTag ? 'put' : 'post';
      const res = await API[method](url, values);
      if (!res.data?.success) {
        showError(res.data?.message);
        return;
      }
      Toast.success(editingTag ? '更新成功' : '创建成功');
      setVisible(false);
      setEditingTag(null);
      loadTags();
    } catch (e) {
      showError(e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await API.delete(`/api/community/admin/tags/${id}`);
      if (!res.data?.success) {
        showError(res.data?.message);
        return;
      }
      Toast.success('删除成功');
      loadTags();
    } catch (e) {
      showError(e.message);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '名称', dataIndex: 'name' },
    { title: '颜色', dataIndex: 'color', render: (c) => <span style={{ color: c }}>{c}</span> },
    { title: '描述', dataIndex: 'description' },
    { title: '排序', dataIndex: 'sort_order', width: 80 },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <>
          <Button size='small' onClick={() => { setEditingTag(record); setVisible(true); }}>编辑</Button>
          <Popconfirm title='确认删除?' onConfirm={() => handleDelete(record.id)}>
            <Button size='small' type='danger' style={{ marginLeft: 8 }}>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <>
      <Button onClick={() => { setEditingTag(null); setVisible(true); }}>新建标签</Button>
      <Table columns={columns} dataSource={tags} loading={loading} style={{ marginTop: 16 }} />
      <Modal
        title={editingTag ? '编辑标签' : '新建标签'}
        visible={visible}
        onCancel={() => { setVisible(false); setEditingTag(null); }}
        footer={null}
      >
        <Form onSubmit={handleSubmit} initValues={editingTag || {}}>
          <Form.Input field='name' label='名称' required />
          <Form.Input field='color' label='颜色' placeholder='blue, red, green...' />
          <Form.Input field='description' label='描述' />
          <Form.InputNumber field='sort_order' label='排序' />
          <Button htmlType='submit' type='primary'>提交</Button>
        </Form>
      </Modal>
    </>
  );
};

export default TagManagement;
