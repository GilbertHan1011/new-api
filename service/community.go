package service

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

func TipCommunityShowcasePost(postId int, fromUserId int, amount int) error {
	if amount <= 0 {
		return errors.New("tip amount must be greater than 0")
	}

	post, err := model.GetCommunityPostById(postId)
	if err != nil {
		return err
	}
	if post.Category != model.CommunityCategoryShowcase {
		return errors.New("only showcase posts can be tipped")
	}
	if post.Status != model.CommunityPostStatusActive {
		return errors.New("post is not active")
	}
	if post.UserId == fromUserId {
		return errors.New("cannot tip your own post")
	}

	quota, err := model.GetUserQuota(fromUserId, true)
	if err != nil {
		return err
	}
	if quota < amount {
		return errors.New("insufficient quota")
	}

	return model.DB.Transaction(func(tx *gorm.DB) error {
		var fromUser model.User
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&fromUser, "id = ?", fromUserId).Error; err != nil {
			return err
		}
		if fromUser.Quota < amount {
			return errors.New("insufficient quota")
		}

		if err := tx.Model(&model.User{}).Where("id = ?", fromUserId).Update("quota", gorm.Expr("quota - ?", amount)).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.User{}).Where("id = ?", post.UserId).Update("quota", gorm.Expr("quota + ?", amount)).Error; err != nil {
			return err
		}
		if err := model.IncreaseCommunityPostTipStats(tx, postId, amount); err != nil {
			return err
		}
		if err := model.CreateCommunityRewardTransaction(tx, &model.CommunityRewardTransaction{
			Kind:       model.CommunityRewardKindTip,
			PostId:     postId,
			FromUserId: fromUserId,
			ToUserId:   post.UserId,
			Amount:     amount,
			Status:     model.CommunityRewardStatusSuccess,
			Remark:     fmt.Sprintf("tip showcase post %d", postId),
		}); err != nil {
			return err
		}
		return nil
	})
}

func CreateCommunityPostWithBusinessRules(post *model.CommunityPost) error {
	if post.Category != model.CommunityCategoryBounty {
		return model.CreateCommunityPost(post)
	}
	if post.RewardAmount <= 0 {
		return errors.New("bounty reward amount must be greater than 0")
	}

	quota, err := model.GetUserQuota(post.UserId, true)
	if err != nil {
		return err
	}
	if quota < post.RewardAmount {
		return errors.New("insufficient quota")
	}

	return model.DB.Transaction(func(tx *gorm.DB) error {
		var owner model.User
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&owner, "id = ?", post.UserId).Error; err != nil {
			return err
		}
		if owner.Quota < post.RewardAmount {
			return errors.New("insufficient quota")
		}
		if err := tx.Model(&model.User{}).Where("id = ?", post.UserId).Update("quota", gorm.Expr("quota - ?", post.RewardAmount)).Error; err != nil {
			return err
		}
		if err := tx.Create(post).Error; err != nil {
			return err
		}
		if err := model.CreateCommunityBountyEscrow(tx, &model.CommunityBountyEscrow{
			PostId:      post.Id,
			OwnerUserId: post.UserId,
			Amount:      post.RewardAmount,
			Status:      model.CommunityBountyEscrowStatusLocked,
		}); err != nil {
			return err
		}
		if err := model.CreateCommunityRewardTransaction(tx, &model.CommunityRewardTransaction{
			Kind:       model.CommunityRewardKindBountyLock,
			PostId:     post.Id,
			FromUserId: post.UserId,
			ToUserId:   0,
			Amount:     post.RewardAmount,
			Status:     model.CommunityRewardStatusSuccess,
			Remark:     fmt.Sprintf("lock bounty reward for post %d", post.Id),
		}); err != nil {
			return err
		}
		return nil
	})
}

func SelectCommunityBountyComment(postId int, ownerUserId int, commentId int) error {
	post, err := model.GetCommunityPostById(postId)
	if err != nil {
		return err
	}
	if post.Category != model.CommunityCategoryBounty {
		return errors.New("only bounty posts support selecting comments")
	}
	if post.UserId != ownerUserId {
		return errors.New("only post owner can select comment")
	}
	if post.Status != model.CommunityPostStatusActive {
		return errors.New("bounty post is not active")
	}

	comment, err := model.GetCommunityCommentById(commentId)
	if err != nil {
		return err
	}
	if comment.PostId != postId {
		return errors.New("comment does not belong to this post")
	}
	if comment.UserId == ownerUserId {
		return errors.New("cannot select your own comment")
	}

	return model.DB.Transaction(func(tx *gorm.DB) error {
		var lockedPost model.CommunityPost
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&lockedPost, "id = ?", postId).Error; err != nil {
			return err
		}
		if lockedPost.Status != model.CommunityPostStatusActive {
			return errors.New("bounty post is not active")
		}

		var escrow model.CommunityBountyEscrow
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&escrow, "post_id = ?", postId).Error; err != nil {
			return err
		}
		if escrow.Status != model.CommunityBountyEscrowStatusLocked {
			return errors.New("bounty escrow is not locked")
		}

		if err := tx.Model(&model.User{}).Where("id = ?", comment.UserId).Update("quota", gorm.Expr("quota + ?", escrow.Amount)).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.CommunityPost{}).Where("id = ?", postId).Updates(map[string]interface{}{
			"status":              model.CommunityPostStatusResolved,
			"selected_comment_id": commentId,
			"reward_paid_amount":  escrow.Amount,
		}).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.CommunityComment{}).Where("id = ?", commentId).Update("is_selected", true).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.CommunityBountyEscrow{}).Where("id = ?", escrow.Id).Updates(map[string]interface{}{
			"status":              model.CommunityBountyEscrowStatusReleased,
			"selected_comment_id": commentId,
			"selected_user_id":    comment.UserId,
		}).Error; err != nil {
			return err
		}
		if err := model.CreateCommunityRewardTransaction(tx, &model.CommunityRewardTransaction{
			Kind:       model.CommunityRewardKindBountyAward,
			PostId:     postId,
			CommentId:  commentId,
			FromUserId: ownerUserId,
			ToUserId:   comment.UserId,
			Amount:     escrow.Amount,
			Status:     model.CommunityRewardStatusSuccess,
			Remark:     fmt.Sprintf("award bounty for post %d", postId),
		}); err != nil {
			return err
		}
		return nil
	})
}

func CancelCommunityBounty(postId int, ownerUserId int) error {
	post, err := model.GetCommunityPostById(postId)
	if err != nil {
		return err
	}
	if post.Category != model.CommunityCategoryBounty {
		return errors.New("only bounty posts can be cancelled")
	}
	if post.UserId != ownerUserId {
		return errors.New("only post owner can cancel bounty")
	}
	if post.Status != model.CommunityPostStatusActive {
		return errors.New("bounty post is not active")
	}

	return model.DB.Transaction(func(tx *gorm.DB) error {
		var lockedPost model.CommunityPost
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&lockedPost, "id = ?", postId).Error; err != nil {
			return err
		}
		if lockedPost.Status != model.CommunityPostStatusActive {
			return errors.New("bounty post is not active")
		}

		var escrow model.CommunityBountyEscrow
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&escrow, "post_id = ?", postId).Error; err != nil {
			return err
		}
		if escrow.Status != model.CommunityBountyEscrowStatusLocked {
			return errors.New("bounty escrow is not locked")
		}

		if err := tx.Model(&model.User{}).Where("id = ?", ownerUserId).Update("quota", gorm.Expr("quota + ?", escrow.Amount)).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.CommunityPost{}).Where("id = ?", postId).Update("status", model.CommunityPostStatusCancelled).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.CommunityBountyEscrow{}).Where("id = ?", escrow.Id).Update("status", model.CommunityBountyEscrowStatusRefunded).Error; err != nil {
			return err
		}
		if err := model.CreateCommunityRewardTransaction(tx, &model.CommunityRewardTransaction{
			Kind:       model.CommunityRewardKindBountyRefund,
			PostId:     postId,
			FromUserId: 0,
			ToUserId:   ownerUserId,
			Amount:     escrow.Amount,
			Status:     model.CommunityRewardStatusSuccess,
			Remark:     fmt.Sprintf("refund bounty for post %d", postId),
		}); err != nil {
			return err
		}
		return nil
	})
}
