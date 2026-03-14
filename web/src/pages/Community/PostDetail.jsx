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
  Banner,
  Button,
  Card,
  Empty,
  Form,
  Modal,
  Skeleton,
  Space,
  Tag,
  Toast,
  Typography,
} from '@douyinfe/semi-ui';
import { API, showError } from '../../helpers';
import { Link, useParams } from 'react-router-dom';
import { getUserIdFromLocalStorage, getRelativeTime } from '../../helpers/utils';
import { stringToColor } from '../../helpers/render';

const CATEGORY_MAP = {
  discussion: { label: '讨论', color: 'blue' },
  showcase: { label: '夸夸', color: 'violet' },
  bounty: { label: '悬赏', color: 'orange' },
};

const toJsTime = (unixSeconds) => (unixSeconds ? unixSeconds * 1000 : 0);

const getInitials = (name) => {
  if (!name) return '??';
  return name.slice(0, 2).toUpperCase();
};

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
  const currentUserId = Number(getUserIdFromLocalStorage());

  const isOwner = useMemo(() => {
    return Number(post?.user_id) > 0 && Number(post?.user_id) === currentUserId;
  }, [post, currentUserId]);

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

  const handleCancelBounty = () => {
    Modal.confirm({
      title: '确认取消悬赏',
      content: '取消后悬赏额度将退回你的账户，此操作不可撤销。确定要取消吗？',
      okText: '确认取消',
      cancelText: '再想想',
      okType: 'danger',
      onOk: async () => {
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
      },
    });
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  const renderPostContent = () => {
    if (!post) return null;

    const displayName = post.display_name || post.username || `User ${post.user_id}`;
    const cat = CATEGORY_MAP[post.category] || CATEGORY_MAP.discussion;
    const relTime = getRelativeTime(toJsTime(post.created_at));

    return (
      <>
        {/* Post Card */}
        <Card className='w-full'>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Title */}
            <Typography.Title heading={3} style={{ margin: 0 }}>
              {post.title}
            </Typography.Title>

            {/* Meta row: avatar + name + category + time + views */}
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
              <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
                {relTime}
              </Typography.Text>
              <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
                {post.view_count || 0} 浏览
              </Typography.Text>
            </div>

            {/* Bounty / Showcase status */}
            {post.category === 'bounty' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Tag color='orange' size='small' type='light'>
                  悬赏 {post.reward_amount || 0}
                </Tag>
                {post.status === 'resolved' && (
                  <Tag color='green' size='small'>已解决</Tag>
                )}
                {post.status === 'cancelled' && (
                  <Tag color='yellow' size='small'>已取消</Tag>
                )}
              </div>
            )}
            {post.category === 'showcase' && (post.tip_total_amount || 0) > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color='violet' size='small' type='light'>
                  已收打赏 {post.tip_total_amount}
                </Tag>
                <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
                  {post.tip_count || 0} 次
                </Typography.Text>
              </div>
            )}

            {/* Bounty status banners */}
            {post.category === 'bounty' && post.status === 'resolved' && (
              <Banner type='success' description='悬赏已完成，奖励已发放给被采纳者。' />
            )}
            {post.category === 'bounty' && post.status === 'cancelled' && (
              <Banner type='warning' description='悬赏已取消，额度已退回发布者账户。' />
            )}

            {/* Full content */}
            <Typography.Paragraph
              style={{ marginBottom: 0, whiteSpace: 'pre-wrap', marginTop: 4 }}
            >
              {post.content}
            </Typography.Paragraph>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              {post.category === 'showcase' && !isOwner && (
                <Button type='primary' theme='solid' onClick={() => setTipVisible(true)}>
                  打赏
                </Button>
              )}
              {post.category === 'showcase' && isOwner && (
                <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
                  这是你的帖子
                </Typography.Text>
              )}
              {post.category === 'bounty' && post.status === 'active' && isOwner && (
                <Button
                  type='danger'
                  theme='outline'
                  onClick={handleCancelBounty}
                  loading={actionSubmitting}
                >
                  取消悬赏
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Comment form */}
        <Card className='w-full' title='发表评论'>
          <Form getFormApi={(api) => setFormApi(api)}>
            <Form.TextArea field='content' placeholder='写下你的评论...' rows={4} noLabel />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Button
                type='primary'
                theme='solid'
                onClick={handleCreateComment}
                loading={submitting}
              >
                发布评论
              </Button>
            </div>
          </Form>
        </Card>

        {/* Comment list */}
        <Card className='w-full' title={`评论 (${comments.length})`}>
          {comments.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              title='暂无评论'
              description='来发第一条评论吧'
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comments.map((comment) => {
                const commentUser = comment.display_name || comment.username || `User ${comment.user_id}`;
                const commentTime = getRelativeTime(toJsTime(comment.created_at));
                const isSelected = comment.is_selected;

                return (
                  <div
                    key={comment.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid var(--semi-color-border)',
                      borderLeft: isSelected ? '3px solid var(--semi-color-success)' : '1px solid var(--semi-color-border)',
                      background: isSelected ? 'var(--semi-color-success-light-default)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Comment header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Avatar
                          size='extra-small'
                          style={{ backgroundColor: stringToColor(commentUser), flexShrink: 0 }}
                        >
                          {getInitials(commentUser)}
                        </Avatar>
                        <Typography.Text strong style={{ fontSize: 13 }}>
                          {commentUser}
                        </Typography.Text>
                        {isSelected && (
                          <Tag color='green' size='small'>已采纳</Tag>
                        )}
                        <Typography.Text type='tertiary' style={{ fontSize: 12 }}>
                          {commentTime}
                        </Typography.Text>
                      </div>

                      {/* Comment content */}
                      <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {comment.content}
                      </Typography.Paragraph>

                      {/* Select button for bounty owner */}
                      {post.category === 'bounty' &&
                        post.status === 'active' &&
                        isOwner &&
                        !isSelected &&
                        Number(comment.user_id) !== currentUserId && (
                          <div>
                            <Button
                              size='small'
                              type='primary'
                              theme='light'
                              onClick={() => handleSelectComment(comment.id)}
                              loading={actionSubmitting}
                            >
                              采纳这条回复
                            </Button>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </>
    );
  };

  return (
    <div className='w-full mt-[60px]'>
      <Space vertical align='start' spacing='medium' className='w-full'>
        <div>
          <Link to='/community' style={{ textDecoration: 'none' }}>
            <Button theme='borderless' type='tertiary'>
              &larr; 返回社区
            </Button>
          </Link>
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
              description='可能帖子 ID 无效或帖子已被删除。'
            />
          </Card>
        ) : (
          renderPostContent()
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
