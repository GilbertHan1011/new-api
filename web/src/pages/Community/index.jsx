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
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Modal,
  Pagination,
  Space,
  Spin,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import { API, showError } from '../../helpers';
import { useNavigate } from 'react-router-dom';
import { getUserIdFromLocalStorage, getRelativeTime } from '../../helpers/utils';
import { stringToColor } from '../../helpers/render';

const CATEGORY_MAP = {
  discussion: { label: '讨论', color: 'blue' },
  showcase: { label: '夸夸', color: 'violet' },
  bounty: { label: '悬赏', color: 'orange' },
};

const CATEGORY_OPTIONS = [
  { key: 'discussion', label: '讨论区' },
  { key: 'showcase', label: '夸夸区' },
  { key: 'bounty', label: '悬赏区' },
];

const toJsTime = (unixSeconds) => (unixSeconds ? unixSeconds * 1000 : 0);

const getInitials = (name) => {
  if (!name) return '??';
  return name.slice(0, 2).toUpperCase();
};

const truncateContent = (content, maxLen = 120) => {
  if (!content) return '';
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen) + '...';
};

const PAGE_SIZE = 20;

const Community = () => {
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState('discussion');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [formApi, setFormApi] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const currentCategoryLabel = useMemo(() => {
    return (
      CATEGORY_OPTIONS.find((item) => item.key === activeKey)?.label || '讨论区'
    );
  }, [activeKey]);

  const loadPosts = async (category, pageNum = 1) => {
    setLoading(true);
    try {
      const res = await API.get('/api/community/posts', {
        params: { category, page: pageNum, page_size: PAGE_SIZE },
      });
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        setPosts([]);
        setTotal(0);
        return;
      }
      setPosts(data?.items || []);
      setTotal(data?.pagination?.total || data?.items?.length || 0);
    } catch (error) {
      console.error(error);
      setPosts([]);
      setTotal(0);
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
      setPage(1);
      await loadPosts(activeKey, 1);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveKey(key);
    setPage(1);
  };

  const handlePageChange = (pageNum) => {
    setPage(pageNum);
    loadPosts(activeKey, pageNum);
  };

  useEffect(() => {
    loadPosts(activeKey, 1);
  }, [activeKey]);

  const renderPostCard = (post) => {
    const displayName = post.display_name || post.username || `User ${post.user_id}`;
    const cat = CATEGORY_MAP[post.category] || CATEGORY_MAP.discussion;
    const relTime = getRelativeTime(toJsTime(post.created_at));

    return (
      <Card
        key={post.id}
        shadows='hover'
        className='w-full'
        style={{ cursor: 'pointer' }}
        onClick={() => navigate(`/community/${post.id}`)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Top row: avatar + name + category + time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Avatar
              size='small'
              style={{ backgroundColor: stringToColor(displayName), flexShrink: 0 }}
            >
              {getInitials(displayName)}
            </Avatar>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {displayName}
            </Typography.Text>
            <Tag color={cat.color} size='small'>
              {cat.label}
            </Tag>
            {post.category === 'bounty' && post.reward_amount > 0 && (
              <Tag color='orange' size='small' type='light'>
                悬赏 {post.reward_amount}
              </Tag>
            )}
            {post.category === 'bounty' && post.status === 'resolved' && (
              <Tag color='green' size='small'>已解决</Tag>
            )}
            {post.category === 'bounty' && post.status === 'cancelled' && (
              <Tag color='yellow' size='small'>已取消</Tag>
            )}
            {post.category === 'showcase' && (post.tip_total_amount || 0) > 0 && (
              <Tag color='violet' size='small' type='light'>
                已收打赏 {post.tip_total_amount}
              </Tag>
            )}
            <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
              {relTime}
            </Typography.Text>
          </div>

          {/* Title */}
          <Typography.Title heading={5} style={{ margin: 0 }}>
            {post.title}
          </Typography.Title>

          {/* Content preview */}
          <Typography.Text type='tertiary' style={{ fontSize: 13 }}>
            {truncateContent(post.content)}
          </Typography.Text>

          {/* Bottom row: stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
              {post.comment_count || 0} 评论
            </Typography.Text>
            <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
              {post.view_count || 0} 浏览
            </Typography.Text>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className='w-full mt-[60px]'>
      <Space vertical align='start' spacing='medium' className='w-full'>
        <div className='w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
          <Typography.Title heading={3} style={{ margin: 0 }}>
            社区
          </Typography.Title>
          <Button theme='solid' type='primary' onClick={() => setCreateVisible(true)}>
            + 发帖
          </Button>
        </div>

        <Card className='w-full'>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {CATEGORY_OPTIONS.map((item) => {
              const cat = CATEGORY_MAP[item.key];
              const isActive = activeKey === item.key;
              return (
                <Tag
                  key={item.key}
                  color={isActive ? cat.color : 'grey'}
                  size='large'
                  type={isActive ? 'solid' : 'light'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleTabChange(item.key)}
                >
                  {item.label}
                </Tag>
              );
            })}
          </div>

          <div>
            {loading ? (
              <div className='py-10 flex justify-center'>
                <Spin size='large' />
              </div>
            ) : posts.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                title={`暂无${currentCategoryLabel}帖子`}
                description='快来发第一篇帖子吧！'
              />
            ) : (
              <Space vertical spacing='medium' className='w-full'>
                {posts.map(renderPostCard)}
              </Space>
            )}
          </div>

          {!loading && total > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
              <Pagination
                total={total}
                currentPage={page}
                pageSize={PAGE_SIZE}
                onChange={handlePageChange}
              />
            </div>
          )}
        </Card>
      </Space>

      <Modal
        title={`发${currentCategoryLabel}帖子`}
        visible={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          formApi?.reset();
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => {
              setCreateVisible(false);
              formApi?.reset();
            }}>取消</Button>
            <Button type='primary' theme='solid' onClick={handleCreatePost} loading={submitting}>
              发布
            </Button>
          </div>
        }
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
