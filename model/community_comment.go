package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	CommunityCommentStatusActive  = "active"
	CommunityCommentStatusHidden  = "hidden"
	CommunityCommentStatusDeleted = "deleted"
)

type CommunityComment struct {
	Id         int    `json:"id" gorm:"primaryKey"`
	PostId     int    `json:"post_id" gorm:"index;not null"`
	UserId     int    `json:"user_id" gorm:"index;not null"`
	ParentId   int    `json:"parent_id" gorm:"index;default:0"`
	Content    string `json:"content" gorm:"type:text;not null"`
	Status     string `json:"status" gorm:"type:varchar(32);index;not null;default:'active'"`
	IsSelected bool   `json:"is_selected" gorm:"default:false"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint;index"`
	UpdatedAt  int64  `json:"updated_at" gorm:"bigint"`
}

func (c *CommunityComment) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if c.CreatedAt == 0 {
		c.CreatedAt = now
	}
	if c.UpdatedAt == 0 {
		c.UpdatedAt = now
	}
	if c.Status == "" {
		c.Status = CommunityCommentStatusActive
	}
	return nil
}

func (c *CommunityComment) BeforeUpdate(tx *gorm.DB) error {
	c.UpdatedAt = common.GetTimestamp()
	return nil
}
