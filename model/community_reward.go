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

func CreateCommunityRewardTransaction(tx *gorm.DB, reward *CommunityRewardTransaction) error {
	useDB := DB
	if tx != nil {
		useDB = tx
	}
	return useDB.Create(reward).Error
}

type CommunityRewardTransactionWithInfo struct {
	CommunityRewardTransaction
	FromUsername    string `json:"from_username"`
	FromDisplayName string `json:"from_display_name"`
	ToUsername      string `json:"to_username"`
	ToDisplayName   string `json:"to_display_name"`
	PostTitle       string `json:"post_title"`
}

func ListCommunityRewardTransactions(userId int, pageInfo *common.PageInfo) ([]*CommunityRewardTransactionWithInfo, int64, error) {
	var total int64
	query := DB.Model(&CommunityRewardTransaction{}).Where("from_user_id = ? OR to_user_id = ?", userId, userId)
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var txns []*CommunityRewardTransaction
	if err := query.Order("id DESC").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&txns).Error; err != nil {
		return nil, 0, err
	}

	return enrichRewardTransactions(txns), total, nil
}

func ListAllCommunityRewardTransactions(pageInfo *common.PageInfo) ([]*CommunityRewardTransactionWithInfo, int64, error) {
	var total int64
	if err := DB.Model(&CommunityRewardTransaction{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var txns []*CommunityRewardTransaction
	if err := DB.Model(&CommunityRewardTransaction{}).Order("id DESC").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&txns).Error; err != nil {
		return nil, 0, err
	}

	return enrichRewardTransactions(txns), total, nil
}

func enrichRewardTransactions(txns []*CommunityRewardTransaction) []*CommunityRewardTransactionWithInfo {
	userIds := make(map[int]bool)
	postIds := make(map[int]bool)
	for _, t := range txns {
		if t.FromUserId > 0 {
			userIds[t.FromUserId] = true
		}
		if t.ToUserId > 0 {
			userIds[t.ToUserId] = true
		}
		if t.PostId > 0 {
			postIds[t.PostId] = true
		}
	}

	userMap := make(map[int]*User)
	for uid := range userIds {
		if u, err := GetUserById(uid, false); err == nil {
			userMap[uid] = u
		}
	}

	postMap := make(map[int]*CommunityPost)
	if len(postIds) > 0 {
		ids := make([]int, 0, len(postIds))
		for pid := range postIds {
			ids = append(ids, pid)
		}
		var posts []*CommunityPost
		DB.Where("id IN ?", ids).Find(&posts)
		for _, p := range posts {
			postMap[p.Id] = p
		}
	}

	result := make([]*CommunityRewardTransactionWithInfo, 0, len(txns))
	for _, t := range txns {
		info := &CommunityRewardTransactionWithInfo{CommunityRewardTransaction: *t}
		if u, ok := userMap[t.FromUserId]; ok {
			info.FromUsername = u.Username
			info.FromDisplayName = u.DisplayName
		}
		if u, ok := userMap[t.ToUserId]; ok {
			info.ToUsername = u.Username
			info.ToDisplayName = u.DisplayName
		}
		if p, ok := postMap[t.PostId]; ok {
			info.PostTitle = p.Title
		}
		result = append(result, info)
	}
	return result
}
