package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	CommunityBountyEscrowStatusLocked   = "locked"
	CommunityBountyEscrowStatusReleased = "released"
	CommunityBountyEscrowStatusRefunded = "refunded"
)

type CommunityBountyEscrow struct {
	Id                int    `json:"id" gorm:"primaryKey"`
	PostId            int    `json:"post_id" gorm:"uniqueIndex;not null"`
	OwnerUserId       int    `json:"owner_user_id" gorm:"index;not null"`
	Amount            int    `json:"amount" gorm:"default:0"`
	Status            string `json:"status" gorm:"type:varchar(32);index;not null;default:'locked'"`
	SelectedCommentId int    `json:"selected_comment_id" gorm:"default:0"`
	SelectedUserId    int    `json:"selected_user_id" gorm:"default:0"`
	CreatedAt         int64  `json:"created_at" gorm:"bigint;index"`
	UpdatedAt         int64  `json:"updated_at" gorm:"bigint"`
}

func (e *CommunityBountyEscrow) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if e.CreatedAt == 0 {
		e.CreatedAt = now
	}
	if e.UpdatedAt == 0 {
		e.UpdatedAt = now
	}
	if e.Status == "" {
		e.Status = CommunityBountyEscrowStatusLocked
	}
	return nil
}

func (e *CommunityBountyEscrow) BeforeUpdate(tx *gorm.DB) error {
	e.UpdatedAt = common.GetTimestamp()
	return nil
}
