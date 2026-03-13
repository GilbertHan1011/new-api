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
import { Button, Card, Empty, Space, Spin, Tabs, Typography } from '@douyinfe/semi-ui';
import { API, showError } from '../../helpers';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CATEGORY_OPTIONS = [
  { key: 'discussion', label: '讨论区' },
  { key: 'showcase', label: '夸夸区' },
  { key: 'bounty', label: '悬赏区' },
];

const Community = () => {
  const { t } = useTranslation();
  const [activeKey, setActiveKey] = useState('discussion');
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  const currentCategoryLabel = useMemo(() => {
    return CATEGORY_OPTIONS.find((item) => item.key === activeKey)?.label || '讨论区';
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
              Phase 1 skeleton：讨论、夸夸、悬赏三类帖子入口已接通。
            </Typography.Text>
          </div>
          <Button theme='solid' type='primary' disabled>
            发帖（即将接入）
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
                description='Phase 1 骨架已完成，接下来会逐步接入真实发帖/评论/打赏/悬赏逻辑。'
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
                            分类：{currentCategoryLabel} · 状态：{post.status || 'active'}
                          </Typography.Text>
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
    </div>
  );
};

export default Community;
