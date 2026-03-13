package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	CommunityRewardKindTip          = "tip"
	CommunityRewardKindBountyLock   = "bounty_lock"
	CommunityRewardKindBountyAward  = "bounty_award"
	CommunityRewardKindBountyRefund = "bounty_refund"

	CommunityRewardStatusSuccess   = "success"
	CommunityRewardStatusCancelled = "cancelled"
)

type CommunityRewardTransaction struct {
	Id         int    `json:"id" gorm:"primaryKey"`
	Kind       string `json:"kind" gorm:"type:varchar(32);index;not null"`
	PostId     int    `json:"post_id" gorm:"index;default:0"`
	CommentId  int    `json:"comment_id" gorm:"index;default:0"`
	FromUserId int    `json:"from_user_id" gorm:"index;default:0"`
	ToUserId   int    `json:"to_user_id" gorm:"index;default:0"`
	Amount     int    `json:"amount" gorm:"default:0"`
	Status     string `json:"status" gorm:"type:varchar(32);index;not null;default:'success'"`
	Remark     string `json:"remark" gorm:"type:text"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint;index"`
}

func (t *CommunityRewardTransaction) BeforeCreate(tx *gorm.DB) error {
	if t.CreatedAt == 0 {
		t.CreatedAt = common.GetTimestamp()
	}
	if t.Status == "" {
		t.Status = CommunityRewardStatusSuccess
	}
	return nil
}
