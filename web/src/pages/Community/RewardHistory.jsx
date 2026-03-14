import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Pagination,
  Space,
  Table,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { API, showError } from '../../helpers';
import { Link } from 'react-router-dom';
import { renderQuota } from '../../helpers/render';
import { getRelativeTime } from '../../helpers/utils';

const KIND_MAP = {
  tip: { label: '打赏', color: 'violet' },
  bounty_lock: { label: '冻结', color: 'orange' },
  bounty_award: { label: '发放', color: 'green' },
  bounty_refund: { label: '退款', color: 'cyan' },
};

const PAGE_SIZE = 20;

const toJsTime = (unixSeconds) => (unixSeconds ? unixSeconds * 1000 : 0);

const CommunityRewardHistory = () => {
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadRewards = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await API.get('/api/community/rewards', {
        params: { p: pageNum, page_size: PAGE_SIZE },
      });
      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        setRewards([]);
        setTotal(0);
        return;
      }
      setRewards(data?.items || []);
      setTotal(data?.pagination?.total || 0);
    } catch (error) {
      console.error(error);
      setRewards([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewards(1);
  }, []);

  const handlePageChange = (pageNum) => {
    setPage(pageNum);
    loadRewards(pageNum);
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (val) => (
        <Typography.Text style={{ fontSize: 12 }}>
          {getRelativeTime(toJsTime(val))}
        </Typography.Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'kind',
      key: 'kind',
      width: 80,
      render: (val) => {
        const info = KIND_MAP[val] || { label: val, color: 'grey' };
        return (
          <Tag color={info.color} size='small'>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: '来源用户',
      dataIndex: 'from_display_name',
      key: 'from_user',
      width: 120,
      render: (val, record) => (
        <Typography.Text style={{ fontSize: 13 }}>
          {val || record.from_username || (record.from_user_id > 0 ? `User ${record.from_user_id}` : '-')}
        </Typography.Text>
      ),
    },
    {
      title: '目标用户',
      dataIndex: 'to_display_name',
      key: 'to_user',
      width: 120,
      render: (val, record) => (
        <Typography.Text style={{ fontSize: 13 }}>
          {val || record.to_username || (record.to_user_id > 0 ? `User ${record.to_user_id}` : '-')}
        </Typography.Text>
      ),
    },
    {
      title: '额度',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (val) => (
        <Typography.Text strong>{renderQuota(val)}</Typography.Text>
      ),
    },
    {
      title: '帖子',
      dataIndex: 'post_title',
      key: 'post_title',
      render: (val, record) =>
        val ? (
          <Link
            to={`/community/${record.post_id}`}
            style={{ textDecoration: 'none', color: 'var(--semi-color-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {val}
          </Link>
        ) : (
          <Typography.Text type='tertiary'>-</Typography.Text>
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (val) => (
        <Tag color={val === 'success' ? 'green' : 'yellow'} size='small'>
          {val === 'success' ? '成功' : val}
        </Tag>
      ),
    },
  ];

  return (
    <div className='w-full mt-[60px]'>
      <Space vertical align='start' spacing='medium' className='w-full'>
        <div className='w-full flex items-center gap-3'>
          <Link to='/community' style={{ textDecoration: 'none' }}>
            <Button theme='borderless' type='tertiary'>
              &larr; 返回社区
            </Button>
          </Link>
          <Typography.Title heading={3} style={{ margin: 0 }}>
            奖励记录
          </Typography.Title>
        </div>

        <Card className='w-full'>
          {!loading && rewards.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              title='暂无奖励记录'
              description='打赏或参与悬赏后这里会显示交易记录'
            />
          ) : (
            <>
              <Table
                columns={columns}
                dataSource={rewards}
                loading={loading}
                pagination={false}
                rowKey='id'
                size='small'
              />
              {total > PAGE_SIZE && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                  <Pagination
                    total={total}
                    currentPage={page}
                    pageSize={PAGE_SIZE}
                    onChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default CommunityRewardHistory;
