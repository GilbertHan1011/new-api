package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	CommunityCategoryDiscussion = "discussion"
	CommunityCategoryShowcase   = "showcase"
	CommunityCategoryBounty     = "bounty"

	CommunityPostStatusActive    = "active"
	CommunityPostStatusResolved  = "resolved"
	CommunityPostStatusCancelled = "cancelled"
	CommunityPostStatusLocked    = "locked"
	CommunityPostStatusHidden    = "hidden"
)

type CommunityPost struct {
	Id                int    `json:"id" gorm:"primaryKey"`
	UserId            int    `json:"user_id" gorm:"index;not null"`
	Category          string `json:"category" gorm:"type:varchar(32);index;not null"`
	Title             string `json:"title" gorm:"type:varchar(255);not null"`
	Content           string `json:"content" gorm:"type:text;not null"`
	Status            string `json:"status" gorm:"type:varchar(32);index;not null;default:'active'"`
	RewardAmount      int    `json:"reward_amount" gorm:"default:0"`
	RewardPaidAmount  int    `json:"reward_paid_amount" gorm:"default:0"`
	SelectedCommentId int    `json:"selected_comment_id" gorm:"default:0"`
	ViewCount         int    `json:"view_count" gorm:"default:0"`
	CommentCount      int    `json:"comment_count" gorm:"default:0"`
	TipCount          int    `json:"tip_count" gorm:"default:0"`
	TipTotalAmount    int    `json:"tip_total_amount" gorm:"default:0"`
	CreatedAt         int64  `json:"created_at" gorm:"bigint;index"`
	UpdatedAt         int64  `json:"updated_at" gorm:"bigint"`
}

func (p *CommunityPost) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if p.CreatedAt == 0 {
		p.CreatedAt = now
	}
	if p.UpdatedAt == 0 {
		p.UpdatedAt = now
	}
	if p.Status == "" {
		p.Status = CommunityPostStatusActive
	}
	return nil
}

func (p *CommunityPost) BeforeUpdate(tx *gorm.DB) error {
	p.UpdatedAt = common.GetTimestamp()
	return nil
}
