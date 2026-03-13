package controller

import (
	"errors"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
	category := strings.TrimSpace(c.Query("category"))
	pageInfo := common.GetPageQuery(c)

	posts, total, err := model.ListCommunityPosts(category, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"items": posts,
		"pagination": gin.H{
			"page":      pageInfo.Page,
			"page_size": pageInfo.PageSize,
			"total":     total,
		},
	})
}

func GetCommunityPost(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	post, err := model.GetCommunityPostDetailById(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "community post not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	_ = model.IncreaseCommunityPostViewCount(id)
	common.ApiSuccess(c, post)
}

func ListCommunityComments(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	comments, err := model.ListCommunityCommentsByPostId(postId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"items": comments,
	})
}

func CreateCommunityPost(c *gin.Context) {
	var req CommunityPostCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	req.Category = strings.TrimSpace(req.Category)
	if req.Category == "" {
		req.Category = model.CommunityCategoryDiscussion
	}
	if err := model.ValidateCommunityCategory(req.Category); err != nil {
		common.ApiError(c, err)
		return
	}

	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Content) == "" {
		common.ApiErrorMsg(c, "title and content are required")
		return
	}

	if req.Category != model.CommunityCategoryBounty {
		req.RewardAmount = 0
	}

	post := &model.CommunityPost{
		UserId:       c.GetInt("id"),
		Category:     req.Category,
		Title:        strings.TrimSpace(req.Title),
		Content:      strings.TrimSpace(req.Content),
		RewardAmount: req.RewardAmount,
		Status:       model.CommunityPostStatusActive,
	}
	if err := service.CreateCommunityPostWithBusinessRules(post); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"id":      post.Id,
		"message": "community post created",
	})
}

func CreateCommunityComment(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}

	post, err := model.GetCommunityPostById(postId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "community post not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	if post.Status == model.CommunityPostStatusLocked || post.Status == model.CommunityPostStatusHidden {
		common.ApiErrorMsg(c, "post is not open for comments")
		return
	}

	var req CommunityCommentCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if strings.TrimSpace(req.Content) == "" {
		common.ApiErrorMsg(c, "comment content is required")
		return
	}
	if req.ParentId > 0 {
		parent, err := model.GetCommunityCommentById(req.ParentId)
		if err != nil {
			common.ApiErrorMsg(c, "parent comment not found")
			return
		}
		if parent.PostId != postId {
			common.ApiErrorMsg(c, "parent comment does not belong to this post")
			return
		}
	}

	comment := &model.CommunityComment{
		PostId:   postId,
		UserId:   c.GetInt("id"),
		ParentId: req.ParentId,
		Content:  strings.TrimSpace(req.Content),
	}
	if err := model.CreateCommunityComment(comment); err != nil {
		common.ApiError(c, err)
		return
	}
	_ = model.IncreaseCommunityPostCommentCount(postId)

	common.ApiSuccess(c, gin.H{
		"id":      comment.Id,
		"message": "community comment created",
	})
}

func TipCommunityPost(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}

	var req CommunityTipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.TipCommunityShowcasePost(postId, c.GetInt("id"), req.Amount); err != nil {
		common.ApiError(c, err)
		return
	}

	model.RecordLog(c.GetInt("id"), model.LogTypeTopup, "community tip sent")
	common.ApiSuccess(c, gin.H{
		"message": "community tip success",
	})
}

func SelectCommunityBountyComment(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	var req CommunitySelectCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := service.SelectCommunityBountyComment(postId, c.GetInt("id"), req.CommentId); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community bounty selected",
	})
}

func CancelCommunityBounty(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	if err := service.CancelCommunityBounty(postId, c.GetInt("id")); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community bounty cancelled",
	})
}

func AdminListCommunityPosts(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	posts, total, err := model.ListCommunityPosts(strings.TrimSpace(c.Query("category")), pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"items": posts,
		"pagination": gin.H{
			"page":      pageInfo.Page,
			"page_size": pageInfo.PageSize,
			"total":     total,
		},
	})
}

func AdminHideCommunityPost(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	if err := model.UpdateCommunityPostStatus(postId, model.CommunityPostStatusHidden); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community post hidden",
	})
}

func AdminLockCommunityPost(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	if err := model.UpdateCommunityPostStatus(postId, model.CommunityPostStatusLocked); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community post locked",
	})
}

func AdminHideCommunityComment(c *gin.Context) {
	commentId, _ := strconv.Atoi(c.Param("id"))
	if commentId <= 0 {
		common.ApiErrorMsg(c, "invalid comment id")
		return
	}
	if err := model.UpdateCommunityCommentStatus(commentId, model.CommunityCommentStatusHidden); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"message": "community comment hidden",
	})
}
