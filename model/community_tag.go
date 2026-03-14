package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

type CommunityTag struct {
	Id          int    `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"type:varchar(64);uniqueIndex;not null"`
	Color       string `json:"color" gorm:"type:varchar(32);default:'blue'"`
	Description string `json:"description" gorm:"type:varchar(255)"`
	Enabled     bool   `json:"enabled" gorm:"default:true"`
	SortOrder   int    `json:"sort_order" gorm:"default:0"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
}

type CommunityPostTag struct {
	Id     int `json:"id" gorm:"primaryKey"`
	PostId int `json:"post_id" gorm:"index;not null"`
	TagId  int `json:"tag_id" gorm:"index;not null"`
}

func (t *CommunityTag) BeforeCreate(tx *gorm.DB) error {
	if t.CreatedAt == 0 {
		t.CreatedAt = common.GetTimestamp()
	}
	return nil
}

func ListCommunityTags(enabledOnly bool) ([]*CommunityTag, error) {
	var tags []*CommunityTag
	query := DB.Model(&CommunityTag{})
	if enabledOnly {
		query = query.Where("enabled = ?", true)
	}
	err := query.Order("sort_order ASC, id ASC").Find(&tags).Error
	return tags, err
}

func CreateCommunityTag(tag *CommunityTag) error {
	return DB.Create(tag).Error
}

func UpdateCommunityTag(id int, updates map[string]interface{}) error {
	return DB.Model(&CommunityTag{}).Where("id = ?", id).Updates(updates).Error
}

func DeleteCommunityTag(id int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("tag_id = ?", id).Delete(&CommunityPostTag{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", id).Delete(&CommunityTag{}).Error
	})
}

func SetCommunityPostTags(tx *gorm.DB, postId int, tagIds []int) error {
	useDB := DB
	if tx != nil {
		useDB = tx
	}
	if err := useDB.Where("post_id = ?", postId).Delete(&CommunityPostTag{}).Error; err != nil {
		return err
	}
	if len(tagIds) > 2 {
		tagIds = tagIds[:2]
	}
	for _, tagId := range tagIds {
		if err := useDB.Create(&CommunityPostTag{PostId: postId, TagId: tagId}).Error; err != nil {
			return err
		}
	}
	return nil
}

func GetBatchPostTags(postIds []int) map[int][]*CommunityTag {
	result := make(map[int][]*CommunityTag)
	if len(postIds) == 0 {
		return result
	}

	var postTags []CommunityPostTag
	DB.Where("post_id IN ?", postIds).Find(&postTags)

	tagIds := make([]int, 0)
	for _, pt := range postTags {
		tagIds = append(tagIds, pt.TagId)
	}
	if len(tagIds) == 0 {
		return result
	}

	var tags []*CommunityTag
	DB.Where("id IN ?", tagIds).Find(&tags)
	tagMap := make(map[int]*CommunityTag)
	for _, tag := range tags {
		tagMap[tag.Id] = tag
	}

	for _, pt := range postTags {
		if tag, ok := tagMap[pt.TagId]; ok {
			result[pt.PostId] = append(result[pt.PostId], tag)
		}
	}
	return result
}

func SeedDefaultCommunityTags() {
	var count int64
	DB.Model(&CommunityTag{}).Count(&count)
	if count > 0 {
		return
	}

	defaultTags := []CommunityTag{
		{Name: "精华神贴", Color: "red", Description: "精华内容", SortOrder: 1},
		{Name: "文档共建", Color: "blue", Description: "社区文档协作", SortOrder: 2},
		{Name: "经验分享", Color: "green", Description: "使用经验分享", SortOrder: 3},
		{Name: "Bug反馈", Color: "orange", Description: "问题与Bug反馈", SortOrder: 4},
		{Name: "功能建议", Color: "violet", Description: "新功能建议", SortOrder: 5},
		{Name: "新手求助", Color: "cyan", Description: "新手求助问题", SortOrder: 6},
	}
	for i := range defaultTags {
		DB.Create(&defaultTags[i])
	}
}
