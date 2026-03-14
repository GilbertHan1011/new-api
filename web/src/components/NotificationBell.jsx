import React, { useEffect, useState } from 'react';
import { Badge, Dropdown, Empty, Typography } from '@douyinfe/semi-ui';
import { IconBell } from '@douyinfe/semi-icons';
import { API } from '../helpers';
import { useNavigate } from 'react-router-dom';
import { getRelativeTime } from '../helpers/utils';

const toJsTime = (unixSeconds) => (unixSeconds ? unixSeconds * 1000 : 0);

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  const loadUnreadCount = async () => {
    try {
      const res = await API.get('/api/notifications/unread-count');
      if (res.data?.success) {
        setUnreadCount(res.data.data?.count || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await API.get('/api/notifications', { params: { p: 1, page_size: 10 } });
      if (res.data?.success) {
        setNotifications(res.data.data?.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await API.post(`/api/notifications/${id}/read`);
      loadUnreadCount();
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.post('/api/notifications/read-all');
      loadUnreadCount();
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleVisibleChange = (v) => {
    setVisible(v);
    if (v) loadNotifications();
  };

  const menu = (
    <div style={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--semi-color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Text strong>通知</Typography.Text>
        {unreadCount > 0 && (
          <Typography.Text link onClick={handleMarkAllAsRead} style={{ fontSize: 12 }}>
            全部已读
          </Typography.Text>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: 24 }}>
          <Empty description="暂无通知" />
        </div>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => {
              if (n.status === 'unread') handleMarkAsRead(n.id);
              if (n.link) navigate(n.link);
              setVisible(false);
            }}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--semi-color-border)',
              cursor: 'pointer',
              backgroundColor: n.status === 'unread' ? 'var(--semi-color-primary-light-default)' : 'transparent',
            }}
          >
            <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>
              {n.title}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              {n.content}
            </Typography.Text>
            <Typography.Text type="tertiary" style={{ fontSize: 11 }}>
              {getRelativeTime(toJsTime(n.created_at))}
            </Typography.Text>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dropdown
      render={menu}
      trigger="click"
      position="bottomRight"
      visible={visible}
      onVisibleChange={handleVisibleChange}
    >
      <div style={{ cursor: 'pointer', position: 'relative', padding: '8px' }}>
        <Badge count={unreadCount} type="danger">
          <IconBell size="large" />
        </Badge>
      </div>
    </Dropdown>
  );
};

export default NotificationBell;
