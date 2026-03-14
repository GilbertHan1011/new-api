package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	NotificationTypeComment = "comment"
	NotificationStatusUnread = "unread"
	NotificationStatusRead = "read"
)

type Notification struct {
	Id        int    `json:"id" gorm:"primaryKey"`
	UserId    int    `json:"user_id" gorm:"index;not null"`
	Type      string `json:"type" gorm:"type:varchar(32);not null"`
	Title     string `json:"title" gorm:"type:varchar(255);not null"`
	Content   string `json:"content" gorm:"type:text"`
	Link      string `json:"link" gorm:"type:varchar(512)"`
	Status    string `json:"status" gorm:"type:varchar(32);default:'unread';index"`
	CreatedAt int64  `json:"created_at" gorm:"bigint;index"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.CreatedAt == 0 {
		n.CreatedAt = common.GetTimestamp()
	}
	if n.Status == "" {
		n.Status = NotificationStatusUnread
	}
	return nil
}

func CreateNotification(notification *Notification) error {
	return DB.Create(notification).Error
}

func ListUserNotifications(userId int, pageInfo *common.PageInfo) ([]*Notification, int64, error) {
	var total int64
	query := DB.Model(&Notification{}).Where("user_id = ?", userId)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var notifications []*Notification
	if err := query.Order("id DESC").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&notifications).Error; err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

func GetUnreadNotificationCount(userId int) (int64, error) {
	var count int64
	err := DB.Model(&Notification{}).Where("user_id = ? AND status = ?", userId, NotificationStatusUnread).Count(&count).Error
	return count, err
}

func MarkNotificationAsRead(id, userId int) error {
	return DB.Model(&Notification{}).Where("id = ? AND user_id = ?", id, userId).Update("status", NotificationStatusRead).Error
}

func MarkAllNotificationsAsRead(userId int) error {
	return DB.Model(&Notification{}).Where("user_id = ? AND status = ?", userId, NotificationStatusUnread).Update("status", NotificationStatusRead).Error
}
