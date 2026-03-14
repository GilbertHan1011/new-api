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
  Select,
  Space,
  Spin,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import MDEditor from '@uiw/react-md-editor';
import { API, showError } from '../../helpers';
import { uploadImage } from '../../helpers/imageUpload';
import { useNavigate } from 'react-router-dom';
import { getUserIdFromLocalStorage, getRelativeTime } from '../../helpers/utils';
import { stringToColor, renderQuota } from '../../helpers/render';
import { displayAmountToQuota } from '../../helpers/quota';

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
  const [tags, setTags] = useState([]);
  const [selectedTagId, setSelectedTagId] = useState(0);
  const [mdContent, setMdContent] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const currentCategoryLabel = useMemo(() => {
    return (
      CATEGORY_OPTIONS.find((item) => item.key === activeKey)?.label || '讨论区'
    );
  }, [activeKey]);

  const loadPosts = async (category, pageNum = 1, tagId = 0) => {
    setLoading(true);
    try {
      const params = { category, p: pageNum, page_size: PAGE_SIZE };
      if (tagId > 0) params.tag_id = tagId;
      const res = await API.get('/api/community/posts', { params });
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
    const content = mdContent || '';
    if (!values.title?.trim() || !content.trim()) {
      Toast.error('标题和内容不能为空');
      return;
    }

    const rewardAmount = Number(values.reward_amount || 0);
    if (activeKey === 'bounty' && rewardAmount < 0.1) {
      Toast.error('悬赏额度最小为 $0.1');
      return;
    }

    const rewardQuota = activeKey === 'bounty' ? displayAmountToQuota(rewardAmount) : 0;

    setSubmitting(true);
    try {
      const res = await API.post('/api/community/posts', {
        category: activeKey,
        title: values.title,
        content: content,
        reward_amount: rewardQuota,
        tag_ids: selectedTagIds,
        is_anonymous: values.is_anonymous || false,
      });
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      Toast.success('帖子已创建');
      setCreateVisible(false);
      formApi.reset();
      setMdContent('');
      setSelectedTagIds([]);
      setPage(1);
      await loadPosts(activeKey, 1, selectedTagId);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveKey(key);
    setPage(1);
    setSelectedTagId(0);
  };

  const handlePageChange = (pageNum) => {
    setPage(pageNum);
    loadPosts(activeKey, pageNum, selectedTagId);
  };

  const handleTagFilter = (tagId) => {
    const newTagId = selectedTagId === tagId ? 0 : tagId;
    setSelectedTagId(newTagId);
    setPage(1);
    loadPosts(activeKey, 1, newTagId);
  };

  const loadTags = async () => {
    try {
      const res = await API.get('/api/community/tags');
      if (res.data?.success) {
        setTags(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        try {
          Toast.info('正在上传图片...');
          const url = await uploadImage(file);
          const imageMarkdown = `![image](${url})`;
          setMdContent(prev => prev + '\n' + imageMarkdown);
          Toast.success('图片上传成功');
        } catch (err) {
          Toast.error(err.message || '图片上传失败');
        }
        break;
      }
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    loadPosts(activeKey, 1, selectedTagId);
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
            {post.is_pinned && (
              <Tag color='red' size='small' type='solid'>
                置顶
              </Tag>
            )}
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
                悬赏 {renderQuota(post.reward_amount)}
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
                已收打赏 {renderQuota(post.tip_total_amount)}
              </Tag>
            )}
            <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
              {relTime}
            </Typography.Text>
            {post.tags?.map((tag) => (
              <Tag key={tag.id} color={tag.color || 'blue'} size='small' type='light'>
                {tag.name}
              </Tag>
            ))}
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
          <div style={{ display: 'flex', gap: 8 }}>
            <Button theme='light' type='tertiary' onClick={() => navigate('/community/rewards')}>
              奖励记录
            </Button>
            <Button theme='solid' type='primary' onClick={() => setCreateVisible(true)}>
              + 发帖
            </Button>
          </div>
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

          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {tags.map((tag) => (
                <Tag
                  key={tag.id}
                  color={selectedTagId === tag.id ? tag.color || 'blue' : 'grey'}
                  size='small'
                  type={selectedTagId === tag.id ? 'solid' : 'light'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleTagFilter(tag.id)}
                >
                  {tag.name}
                </Tag>
              ))}
            </div>
          )}

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
          setMdContent('');
          setSelectedTagIds([]);
        }}
        width={700}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => {
              setCreateVisible(false);
              formApi?.reset();
              setMdContent('');
              setSelectedTagIds([]);
            }}>取消</Button>
            <Button type='primary' theme='solid' onClick={handleCreatePost} loading={submitting}>
              发布
            </Button>
          </div>
        }
      >
        <Form getFormApi={(api) => setFormApi(api)}>
          <Form.Input field='title' label='标题' placeholder='输入帖子标题' />
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              内容
            </Typography.Text>
            <div data-color-mode='light'>
              <MDEditor
                value={mdContent}
                onChange={(val) => setMdContent(val || '')}
                height={300}
                preview='edit'
                onPaste={handlePaste}
              />
            </div>
          </div>
          {tags.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                标签（最多2个）
              </Typography.Text>
              <Select
                multiple
                maxTagCount={2}
                placeholder='选择标签'
                value={selectedTagIds}
                onChange={(val) => {
                  if (val.length <= 2) setSelectedTagIds(val);
                  else Toast.warning('最多选择2个标签');
                }}
                style={{ width: '100%' }}
              >
                {tags.map((tag) => (
                  <Select.Option key={tag.id} value={tag.id}>
                    {tag.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}
          {activeKey === 'bounty' && (
            <Form.InputNumber
              field='reward_amount'
              label='悬赏额度（美元）'
              min={0.1}
              step={0.1}
              precision={2}
              prefix='$'
              extraText='悬赏帖创建后会立即从钱包冻结这部分额度，采纳时发给被采纳者，取消时退回。'
            />
          )}
          <Form.Checkbox field='is_anonymous'>匿名发帖</Form.Checkbox>
        </Form>
      </Modal>
    </div>
  );
};

export default Community;
