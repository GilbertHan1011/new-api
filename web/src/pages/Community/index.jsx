/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Modal,
  Space,
  Spin,
  Tabs,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import { API, showError } from '../../helpers';
import { Link } from 'react-router-dom';
import { getUserIdFromLocalStorage } from '../../helpers/utils';

const CATEGORY_OPTIONS = [
  { key: 'discussion', label: '讨论区' },
  { key: 'showcase', label: '夸夸区' },
  { key: 'bounty', label: '悬赏区' },
];

const Community = () => {
  const [activeKey, setActiveKey] = useState('discussion');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [formApi, setFormApi] = useState(null);
  const currentUserId = Number(getUserIdFromLocalStorage());

  const currentCategoryLabel = useMemo(() => {
    return (
      CATEGORY_OPTIONS.find((item) => item.key === activeKey)?.label || '讨论区'
    );
  }, [activeKey]);

  const loadPosts = async (category) => {
    setLoading(true);
    try {
      const res = await API.get('/api/community/posts', {
        params: { category },
      });
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        setPosts([]);
        return;
      }
      setPosts(data?.items || []);
    } catch (error) {
      console.error(error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!formApi) return;
    const values = formApi.getValues();
    if (!values.title?.trim() || !values.content?.trim()) {
      Toast.error('标题和内容不能为空');
      return;
    }

    const rewardAmount = Number(values.reward_amount || 0);
    if (activeKey === 'bounty' && rewardAmount <= 0) {
      Toast.error('悬赏帖必须填写大于 0 的悬赏额度');
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post('/api/community/posts', {
        category: activeKey,
        title: values.title,
        content: values.content,
        reward_amount: activeKey === 'bounty' ? rewardAmount : 0,
      });
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      Toast.success('帖子已创建');
      setCreateVisible(false);
      formApi.reset();
      await loadPosts(activeKey);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadPosts(activeKey);
  }, [activeKey]);

  return (
    <div className='w-full p-4 md:p-6'>
      <Space vertical align='start' spacing='medium' className='w-full'>
        <div className='w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
          <div>
            <Typography.Title heading={3} style={{ margin: 0 }}>
              社区
            </Typography.Title>
            <Typography.Text type='tertiary'>
              Phase 1：讨论区、夸夸区、悬赏区核心链路已接通。
            </Typography.Text>
          </div>
          <Button theme='solid' type='primary' onClick={() => setCreateVisible(true)}>
            发帖
          </Button>
        </div>

        <Card className='w-full'>
          <Tabs type='card' activeKey={activeKey} onChange={setActiveKey}>
            {CATEGORY_OPTIONS.map((item) => (
              <Tabs.TabPane tab={item.label} itemKey={item.key} key={item.key} />
            ))}
          </Tabs>

          <div className='mt-4'>
            {loading ? (
              <div className='py-10 flex justify-center'>
                <Spin size='large' />
              </div>
            ) : posts.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                title={`暂无${currentCategoryLabel}帖子`}
                description='现在可以发讨论、夸夸、悬赏三类帖子。'
              />
            ) : (
              <Space vertical spacing='medium' className='w-full'>
                {posts.map((post) => (
                  <Card key={post.id} shadows='hover' className='w-full'>
                    <Space vertical align='start' spacing='small' className='w-full'>
                      <div className='w-full flex items-start justify-between gap-3'>
                        <div>
                          <Typography.Title heading={5} style={{ margin: 0 }}>
                            <Link to={`/community/${post.id}`}>{post.title}</Link>
                          </Typography.Title>
                          <Typography.Text type='tertiary'>
                            分类：{currentCategoryLabel} · 作者：
                            {post.display_name || post.username || `User ${post.user_id}`} · 状态：
                            {post.status || 'active'}
                          </Typography.Text>
                          {post.category === 'showcase' && (
                            <Typography.Text type='tertiary'>
                              累计打赏：{post.tip_total_amount || 0}
                            </Typography.Text>
                          )}
                          {post.category === 'bounty' && (
                            <Typography.Text type='tertiary'>
                              悬赏额度：{post.reward_amount || 0}
                              {Number(post.user_id) === currentUserId ? ' · 你的帖子' : ''}
                            </Typography.Text>
                          )}
                        </div>
                      </div>
                      <Typography.Paragraph style={{ marginBottom: 0 }}>
                        {post.content}
                      </Typography.Paragraph>
                    </Space>
                  </Card>
                ))}
              </Space>
            )}
          </div>
        </Card>
      </Space>

      <Modal
        title={`发${currentCategoryLabel}帖子`}
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
        onOk={handleCreatePost}
        okText='发布'
        confirmLoading={submitting}
      >
        <Form getFormApi={(api) => setFormApi(api)}>
          <Form.Input field='title' label='标题' placeholder='输入帖子标题' />
          <Form.TextArea field='content' label='内容' placeholder='输入帖子内容' rows={8} />
          {activeKey === 'bounty' && (
            <Form.InputNumber
              field='reward_amount'
              label='悬赏额度'
              min={1}
              extraText='悬赏帖创建后会立即冻结这部分额度，采纳时发给被采纳者，取消时退回。'
            />
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Community;
