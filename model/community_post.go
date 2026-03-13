package model

import (
	"errors"

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

type CommunityPostWithAuthor struct {
	CommunityPost
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
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

func CreateCommunityPost(post *CommunityPost) error {
	return DB.Create(post).Error
}

func GetCommunityPostById(id int) (*CommunityPost, error) {
	var post CommunityPost
	err := DB.First(&post, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func GetCommunityPostDetailById(id int) (*CommunityPostWithAuthor, error) {
	var post CommunityPost
	err := DB.First(&post, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	user, userErr := GetUserById(post.UserId, false)
	if userErr != nil {
		return nil, userErr
	}
	return &CommunityPostWithAuthor{
		CommunityPost: post,
		Username:      user.Username,
		DisplayName:   user.DisplayName,
	}, nil
}

func ListCommunityPosts(category string, pageInfo *common.PageInfo) ([]*CommunityPostWithAuthor, int64, error) {
	query := DB.Model(&CommunityPost{}).Where("status <> ?", CommunityPostStatusHidden)
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var posts []*CommunityPost
	if err := query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&posts).Error; err != nil {
		return nil, 0, err
	}

	result := make([]*CommunityPostWithAuthor, 0, len(posts))
	for _, post := range posts {
		user, err := GetUserById(post.UserId, false)
		if err != nil {
			continue
		}
		result = append(result, &CommunityPostWithAuthor{
			CommunityPost: *post,
			Username:      user.Username,
			DisplayName:   user.DisplayName,
		})
	}
	return result, total, nil
}

func IncreaseCommunityPostCommentCount(postId int) error {
	return DB.Model(&CommunityPost{}).Where("id = ?", postId).Update("comment_count", gorm.Expr("comment_count + ?", 1)).Error
}

func IncreaseCommunityPostViewCount(postId int) error {
	return DB.Model(&CommunityPost{}).Where("id = ?", postId).Update("view_count", gorm.Expr("view_count + ?", 1)).Error
}

func IncreaseCommunityPostTipStats(tx *gorm.DB, postId int, amount int) error {
	useDB := DB
	if tx != nil {
		useDB = tx
	}
	return useDB.Model(&CommunityPost{}).Where("id = ?", postId).Updates(map[string]interface{}{
		"tip_count":        gorm.Expr("tip_count + ?", 1),
		"tip_total_amount": gorm.Expr("tip_total_amount + ?", amount),
	}).Error
}

func UpdateCommunityPostStatus(postId int, status string) error {
	return DB.Model(&CommunityPost{}).Where("id = ?", postId).Update("status", status).Error
}

func ValidateCommunityCategory(category string) error {
	switch category {
	case CommunityCategoryDiscussion, CommunityCategoryShowcase, CommunityCategoryBounty:
		return nil
	default:
		return errors.New("invalid community category")
	}
}
