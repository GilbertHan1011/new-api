package model

import "gorm.io/gorm"

import (
	"github.com/QuantumNous/new-api/common"
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

type CommunityCommentWithAuthor struct {
	CommunityComment
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
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

func CreateCommunityComment(comment *CommunityComment) error {
	return DB.Create(comment).Error
}

func ListCommunityCommentsByPostId(postId int) ([]*CommunityCommentWithAuthor, error) {
	var comments []*CommunityComment
	if err := DB.Where("post_id = ? AND status <> ?", postId, CommunityCommentStatusHidden).Order("id asc").Find(&comments).Error; err != nil {
		return nil, err
	}

	result := make([]*CommunityCommentWithAuthor, 0, len(comments))
	for _, comment := range comments {
		user, err := GetUserById(comment.UserId, false)
		if err != nil {
			continue
		}
		result = append(result, &CommunityCommentWithAuthor{
			CommunityComment: *comment,
			Username:         user.Username,
			DisplayName:      user.DisplayName,
		})
	}
	return result, nil
}

func GetCommunityCommentById(id int) (*CommunityComment, error) {
	var comment CommunityComment
	if err := DB.First(&comment, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}