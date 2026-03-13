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

import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Form,
  Modal,
  Skeleton,
  Space,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import { API, showError } from '../../helpers';
import { Link, useParams } from 'react-router-dom';

const CommunityPostDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tipSubmitting, setTipSubmitting] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [formApi, setFormApi] = useState(null);
  const [tipFormApi, setTipFormApi] = useState(null);

  const loadPost = async () => {
    setLoading(true);
    try {
      const [postRes, commentsRes] = await Promise.all([
        API.get(`/api/community/posts/${id}`),
        API.get(`/api/community/posts/${id}/comments`),
      ]);

      if (!postRes.data?.success) {
        showError(postRes.data?.message || '加载帖子失败');
        setPost(null);
        return;
      }

      setPost(postRes.data?.data || null);
      setComments(commentsRes.data?.data?.items || []);
    } catch (error) {
      console.error(error);
      setPost(null);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async () => {
    if (!formApi) return;
    const values = formApi.getValues();
    if (!values.content?.trim()) {
      Toast.error('评论内容不能为空');
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post(`/api/community/posts/${id}/comments`, {
        content: values.content,
        parent_id: 0,
      });
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      Toast.success('评论已发布');
      formApi.reset();
      await loadPost();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTip = async () => {
    if (!tipFormApi) return;
    const values = tipFormApi.getValues();
    const amount = Number(values.amount || 0);
    if (amount <= 0) {
      Toast.error('打赏额度必须大于 0');
      return;
    }

    setTipSubmitting(true);
    try {
      const res = await API.post(`/api/community/posts/${id}/tip`, {
        amount,
      });
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      Toast.success('打赏成功');
      setTipVisible(false);
      tipFormApi.reset();
      await loadPost();
    } catch (error) {
      console.error(error);
    } finally {
      setTipSubmitting(false);
    }
  };

  const handleSelectComment = async (commentId) => {
    setActionSubmitting(true);
    try {
      const res = await API.post(`/api/community/posts/${id}/select-comment`, {
        comment_id: commentId,
      });
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      Toast.success('已采纳该回复');
      await loadPost();
    } catch (error) {
      console.error(error);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCancelBounty = async () => {
    setActionSubmitting(true);
    try {
      const res = await API.post(`/api/community/posts/${id}/cancel-bounty`, {});
      const { success, message } = res.data;
      if (!success) {
        showError(message);
        return;
      }
      Toast.success('悬赏已取消并退款');
      await loadPost();
    } catch (error) {
      console.error(error);
    } finally {
      setActionSubmitting(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  return (
    <div className='w-full p-4 md:p-6'>
      <Space vertical align='start' spacing='medium' className='w-full'>
        <div>
          <Link to='/community'>← 返回社区</Link>
        </div>

        {loading ? (
          <Card className='w-full'>
            <Skeleton
              placeholder={<Skeleton.Title style={{ width: '40%' }} />}
              loading={true}
            />
            <Skeleton
              placeholder={<Skeleton.Paragraph rows={6} />}
              loading={true}
            />
          </Card>
        ) : !post ? (
          <Card className='w-full'>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              title='帖子不存在'
              description='可能帖子 ID 无效，或者后端还未返回数据。'
            />
          </Card>
        ) : (
          <>
            <Card className='w-full'>
              <Space vertical align='start' spacing='small' className='w-full'>
                <Typography.Title heading={3} style={{ margin: 0 }}>
                  {post.title}
                </Typography.Title>
                <Typography.Text type='tertiary'>
                  分类：{post.category} · 作者：
                  {post.display_name || post.username || `User ${post.user_id}`} · 状态：
                  {post.status}
                </Typography.Text>
                {post.category === 'showcase' && (
                  <Typography.Text type='tertiary'>
                    累计打赏：{post.tip_total_amount || 0} · 次数：{post.tip_count || 0}
                  </Typography.Text>
                )}
                {post.category === 'bounty' && (
                  <Typography.Text type='tertiary'>
                    悬赏额度：{post.reward_amount || 0} · 已支付：{post.reward_paid_amount || 0}
                  </Typography.Text>
                )}
                <Typography.Paragraph
                  style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
                >
                  {post.content}
                </Typography.Paragraph>
                <Space>
                  {post.category === 'showcase' && (
                    <Button type='primary' theme='solid' onClick={() => setTipVisible(true)}>
                      打赏
                    </Button>
                  )}
                  {post.category === 'bounty' && post.status === 'active' && (
                    <Button
                      type='danger'
                      theme='outline'
                      onClick={handleCancelBounty}
                      loading={actionSubmitting}
                    >
                      取消悬赏
                    </Button>
                  )}
                </Space>
              </Space>
            </Card>

            <Card className='w-full' title={`发表评论`}>
              <Form getFormApi={(api) => setFormApi(api)}>
                <Form.TextArea field='content' placeholder='输入评论内容' rows={4} />
                <Button
                  type='primary'
                  theme='solid'
                  onClick={handleCreateComment}
                  loading={submitting}
                >
                  发布评论
                </Button>
              </Form>
            </Card>

            <Card className='w-full' title={`评论（${comments.length}）`}>
              {comments.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  title='暂无评论'
                  description='现在已经支持真实评论创建，来发第一条吧。'
                />
              ) : (
                <Space vertical align='start' spacing='medium' className='w-full'>
                  {comments.map((comment) => (
                    <Card key={comment.id} className='w-full'>
                      <Space vertical align='start' spacing='small' className='w-full'>
                        <Typography.Text type='tertiary'>
                          {comment.display_name || comment.username || `User ${comment.user_id}`}
                        </Typography.Text>
                        <Typography.Paragraph style={{ marginBottom: 0 }}>
                          {comment.content}
                        </Typography.Paragraph>
                        {post.category === 'bounty' && post.status === 'active' && !comment.is_selected && (
                          <Button
                            size='small'
                            type='primary'
                            theme='light'
                            onClick={() => handleSelectComment(comment.id)}
                            loading={actionSubmitting}
                          >
                            采纳这条回复
                          </Button>
                        )}
                        {comment.is_selected && (
                          <Typography.Text type='success'>已采纳</Typography.Text>
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </>
        )}
      </Space>

      <Modal
        title='打赏作者'
        visible={tipVisible}
        onCancel={() => setTipVisible(false)}
        onOk={handleTip}
        okText='确认打赏'
        confirmLoading={tipSubmitting}
      >
        <Form getFormApi={(api) => setTipFormApi(api)}>
          <Form.InputNumber field='amount' label='打赏额度' min={1} />
        </Form>
      </Modal>
    </div>
  );
};

export default CommunityPostDetail;
