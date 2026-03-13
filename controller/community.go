package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

type CommunityPostCreateRequest struct {
	Category     string `json:"category"`
	Title        string `json:"title"`
	Content      string `json:"content"`
	RewardAmount int    `json:"reward_amount"`
}

type CommunityCommentCreateRequest struct {
	Content  string `json:"content"`
	ParentId int    `json:"parent_id"`
}

type CommunityTipRequest struct {
	Amount int `json:"amount"`
}

type CommunitySelectCommentRequest struct {
	CommentId int `json:"comment_id"`
}

func ListCommunityPosts(c *gin.Context) {
	category := c.Query("category")
	if category == "" {
		category = model.CommunityCategoryDiscussion
	}

	posts := []gin.H{
		{
			"id":               1,
			"category":         category,
			"title":            "Community Phase 1 skeleton",
			"content":          "Community module skeleton is now wired into backend and frontend.",
			"status":           model.CommunityPostStatusActive,
			"reward_amount":    0,
			"tip_total_amount": 0,
			"comment_count":    0,
			"created_at":       common.GetTimestamp(),
		},
	}
	common.ApiSuccess(c, gin.H{
		"items": posts,
		"pagination": gin.H{
			"page":      1,
			"page_size": 20,
			"total":     len(posts),
		},
	})
}

func GetCommunityPost(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	common.ApiSuccess(c, gin.H{
		"id":               id,
		"category":         model.CommunityCategoryDiscussion,
		"title":            "Community Phase 1 skeleton",
		"content":          "This is a placeholder post detail returned by the Phase 1 skeleton endpoint.",
		"status":           model.CommunityPostStatusActive,
		"reward_amount":    0,
		"tip_total_amount": 0,
		"comment_count":    0,
		"created_at":       common.GetTimestamp(),
	})
}

func ListCommunityComments(c *gin.Context) {
	common.ApiSuccess(c, gin.H{
		"items": []gin.H{},
	})
}

func CreateCommunityPost(c *gin.Context) {
	var req CommunityPostCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community create post skeleton ready",
		"post":    req,
	})
}

func CreateCommunityComment(c *gin.Context) {
	var req CommunityCommentCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community create comment skeleton ready",
		"comment": req,
	})
}

func TipCommunityPost(c *gin.Context) {
	var req CommunityTipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community tip skeleton ready",
		"tip":     req,
	})
}

func SelectCommunityBountyComment(c *gin.Context) {
	var req CommunitySelectCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community bounty select skeleton ready",
		"select":  req,
	})
}

func CancelCommunityBounty(c *gin.Context) {
	common.ApiSuccess(c, gin.H{
		"message": "community bounty cancel skeleton ready",
	})
}

func AdminListCommunityPosts(c *gin.Context) {
	common.ApiSuccess(c, gin.H{
		"items": []gin.H{},
	})
}

func AdminHideCommunityPost(c *gin.Context) {
	common.ApiSuccess(c, gin.H{
		"message": "community admin hide post skeleton ready",
	})
}

func AdminLockCommunityPost(c *gin.Context) {
	common.ApiSuccess(c, gin.H{
		"message": "community admin lock post skeleton ready",
	})
}

func AdminHideCommunityComment(c *gin.Context) {
	common.ApiSuccess(c, gin.H{
		"message": "community admin hide comment skeleton ready",
	})
}
