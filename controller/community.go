package controller

import (
	"errors"
	"fmt"
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
	TagIds       []int  `json:"tag_ids"`
	IsAnonymous  bool   `json:"is_anonymous"`
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
	tagId, _ := strconv.Atoi(c.Query("tag_id"))
	pageInfo := common.GetPageQuery(c)

	posts, total, err := model.ListCommunityPosts(category, tagId, pageInfo)
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

	if len(req.TagIds) > 2 {
		common.ApiErrorMsg(c, "at most 2 tags are allowed")
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
		IsAnonymous:  req.IsAnonymous,
	}
	if err := service.CreateCommunityPostWithBusinessRules(post); err != nil {
		common.ApiError(c, err)
		return
	}

	if len(req.TagIds) > 0 {
		_ = model.SetCommunityPostTags(nil, post.Id, req.TagIds)
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

	// Send notification to post owner
	if post.UserId != c.GetInt("id") {
		_ = model.CreateNotification(&model.Notification{
			UserId:  post.UserId,
			Type:    model.NotificationTypeComment,
			Title:   "新评论",
			Content: fmt.Sprintf("你的帖子《%s》收到了新评论", post.Title),
			Link:    fmt.Sprintf("/community/%d", postId),
		})
	}

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
	tagId, _ := strconv.Atoi(c.Query("tag_id"))
	posts, total, err := model.ListCommunityPosts(strings.TrimSpace(c.Query("category")), tagId, pageInfo)
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

// --- Tag management ---

func ListCommunityTags(c *gin.Context) {
	tags, err := model.ListCommunityTags(true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, tags)
}

func AdminListCommunityTags(c *gin.Context) {
	tags, err := model.ListCommunityTags(false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, tags)
}

type CommunityTagRequest struct {
	Name        string `json:"name"`
	Color       string `json:"color"`
	Description string `json:"description"`
	Enabled     *bool  `json:"enabled"`
	SortOrder   int    `json:"sort_order"`
}

func AdminCreateCommunityTag(c *gin.Context) {
	var req CommunityTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if strings.TrimSpace(req.Name) == "" {
		common.ApiErrorMsg(c, "tag name is required")
		return
	}
	tag := &model.CommunityTag{
		Name:        strings.TrimSpace(req.Name),
		Color:       req.Color,
		Description: req.Description,
		Enabled:     true,
		SortOrder:   req.SortOrder,
	}
	if tag.Color == "" {
		tag.Color = "blue"
	}
	if err := model.CreateCommunityTag(tag); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, tag)
}

func AdminUpdateCommunityTag(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid tag id")
		return
	}
	var req CommunityTagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	updates := map[string]interface{}{
		"name":        strings.TrimSpace(req.Name),
		"color":       req.Color,
		"description": req.Description,
		"sort_order":  req.SortOrder,
	}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}
	if err := model.UpdateCommunityTag(id, updates); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "tag updated"})
}

func AdminDeleteCommunityTag(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid tag id")
		return
	}
	if err := model.DeleteCommunityTag(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "tag deleted"})
}

func AdminFeatureCommunityPost(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	var req struct {
		Featured bool `json:"featured"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdateCommunityPostFeatured(postId, req.Featured); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "post featured status updated"})
}

func AdminPinCommunityPost(c *gin.Context) {
	postId, _ := strconv.Atoi(c.Param("id"))
	if postId <= 0 {
		common.ApiErrorMsg(c, "invalid post id")
		return
	}
	var req struct {
		Pinned bool `json:"pinned"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdateCommunityPostPinned(postId, req.Pinned); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "post pinned status updated"})
}

// --- Reward history ---

func ListCommunityRewards(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	txns, total, err := model.ListCommunityRewardTransactions(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"items": txns,
		"pagination": gin.H{
			"page":      pageInfo.Page,
			"page_size": pageInfo.PageSize,
			"total":     total,
		},
	})
}

func AdminListCommunityRewards(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	txns, total, err := model.ListAllCommunityRewardTransactions(pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"items": txns,
		"pagination": gin.H{
			"page":      pageInfo.Page,
			"page_size": pageInfo.PageSize,
			"total":     total,
		},
	})
}

// --- Notifications ---

func ListNotifications(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	notifications, total, err := model.ListUserNotifications(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"items": notifications,
		"pagination": gin.H{
			"page":      pageInfo.Page,
			"page_size": pageInfo.PageSize,
			"total":     total,
		},
	})
}

func GetUnreadCount(c *gin.Context) {
	userId := c.GetInt("id")
	count, err := model.GetUnreadNotificationCount(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"count": count})
}

func MarkNotificationRead(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := model.MarkNotificationAsRead(id, c.GetInt("id")); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "marked as read"})
}

func MarkAllNotificationsRead(c *gin.Context) {
	if err := model.MarkAllNotificationsAsRead(c.GetInt("id")); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "all marked as read"})
}
