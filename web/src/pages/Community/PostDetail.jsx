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
import { Button, Card, Empty, Skeleton, Space, Typography } from '@douyinfe/semi-ui';
import { API, showError } from '../../helpers';
import { Link, useParams } from 'react-router-dom';

const CommunityPostDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);

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
            <Skeleton placeholder={<Skeleton.Title style={{ width: '40%' }} />} loading={true} />
            <Skeleton placeholder={<Skeleton.Paragraph rows={6} />} loading={true} />
          </Card>
        ) : !post ? (
          <Card className='w-full'>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              title='帖子不存在'
              description='可能还没接入真实数据，或者帖子 ID 无效。'
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
                  分类：{post.category} · 状态：{post.status}
                </Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </Typography.Paragraph>
                <Space>
                  <Button disabled>评论（即将接入）</Button>
                  {post.category === 'showcase' && (
                    <Button type='primary' theme='solid' disabled>
                      打赏（即将接入）
                    </Button>
                  )}
                  {post.category === 'bounty' && (
                    <Button type='primary' theme='solid' disabled>
                      采纳回复（即将接入）
                    </Button>
                  )}
                </Space>
              </Space>
            </Card>

            <Card className='w-full' title={`评论（${comments.length}）`}>
              {comments.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  title='暂无评论'
                  description='Phase 1 当前已接通评论接口骨架，下一步会接入真实创建和展示逻辑。'
                />
              ) : (
                <Space vertical align='start' spacing='medium' className='w-full'>
                  {comments.map((comment) => (
                    <Card key={comment.id} className='w-full'>
                      <Typography.Paragraph style={{ marginBottom: 0 }}>
                        {comment.content}
                      </Typography.Paragraph>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </>
        )}
      </Space>
    </div>
  );
};

export default CommunityPostDetail;
