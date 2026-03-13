# Community Phase 1 Implementation Plan

## Goal
Build a minimal community module inside new-api with three forum-like sections:
- `discussion`: normal discussion threads
- `showcase`: accomplishment / brag / support posts with tipping
- `bounty`: request posts with escrowed quota and accepted-answer payout

Phase 1 is intentionally scoped to the minimum useful version.

## Product Rules
- Reuse existing `user.quota` as the in-app community token for Phase 1.
- Use one unified post system with category-based behavior instead of three separate systems.
- Public reading is allowed for list/detail; posting/commenting/tipping/bounty actions require login.
- Comments support top-level comments plus one-level replies via `parent_id`.
- No attachments, no rich text editor, no notifications, no moderation dashboard beyond simple admin endpoints.

## Scope
### In
- Discussion posts: create/list/detail/comment
- Showcase posts: create/list/detail/comment/tip
- Bounty posts: create with escrow/comment/select accepted comment/cancel refund
- Basic admin moderation endpoints: hide/lock post, hide comment
- Frontend skeleton pages and navigation entry

### Out
- Search
- Tags
- Likes/favorites
- Notifications
- Rankings
- Attachments
- Full threaded discussion tree
- Rich text editor
- Dedicated wallet system separate from `quota`

## Data Model
### `community_posts`
Fields:
- `id`
- `user_id`
- `category` (`discussion` | `showcase` | `bounty`)
- `title`
- `content`
- `status` (`active` | `resolved` | `cancelled` | `locked` | `hidden`)
- `reward_amount`
- `reward_paid_amount`
- `selected_comment_id`
- `view_count`
- `comment_count`
- `tip_count`
- `tip_total_amount`
- `created_at`
- `updated_at`

### `community_comments`
Fields:
- `id`
- `post_id`
- `user_id`
- `parent_id`
- `content`
- `status` (`active` | `hidden` | `deleted`)
- `is_selected`
- `created_at`
- `updated_at`

### `community_reward_transactions`
Fields:
- `id`
- `kind` (`tip` | `bounty_lock` | `bounty_award` | `bounty_refund`)
- `post_id`
- `comment_id`
- `from_user_id`
- `to_user_id`
- `amount`
- `status` (`success` | `cancelled`)
- `remark`
- `created_at`

### `community_bounty_escrows`
Fields:
- `id`
- `post_id`
- `owner_user_id`
- `amount`
- `status` (`locked` | `released` | `refunded`)
- `selected_comment_id`
- `selected_user_id`
- `created_at`
- `updated_at`

## Backend Plan
### Models
Create:
- `model/community_post.go`
- `model/community_comment.go`
- `model/community_reward.go`
- `model/community_bounty.go`

Register all four models in `model/main.go` migration.

### Service Layer
Create `service/community.go` for transactional business logic:
- `CreateCommunityPost`
- `CreateBountyPostWithEscrow`
- `TipShowcasePost`
- `SelectBountyComment`
- `CancelBountyPost`

### Controller Layer
Create `controller/community.go`:
- `ListCommunityPosts`
- `GetCommunityPost`
- `ListCommunityComments`
- `CreateCommunityPost`
- `CreateCommunityComment`
- `TipCommunityPost`
- `SelectCommunityBountyComment`
- `CancelCommunityBounty`
- `AdminListCommunityPosts`
- `AdminHideCommunityPost`
- `AdminLockCommunityPost`
- `AdminHideCommunityComment`

### Router
Add `/api/community` routes to `router/api-router.go`:
- public GET routes for list/detail/comments
- authenticated POST routes for create/comment/tip/select/cancel
- admin routes for moderation

## Frontend Plan
### Routes
Add:
- `/community`
- `/community/:id`

### Pages
Create:
- `web/src/pages/Community/index.jsx`
- `web/src/pages/Community/PostDetail.jsx`

### Navigation
Add `community` entry to sidebar and router map.

### Initial UI
Community home page should provide:
- Tabs for Discussion / Showcase / Bounty
- Post list cards
- Placeholder create button
- Empty state and loading state

Post detail page should provide:
- Post metadata and content
- Comment list placeholder
- Placeholder action buttons based on category

## Development Order
1. Add models and migrations
2. Add controller/router skeleton returning placeholder data
3. Add frontend routes/pages/sidebar entry
4. Run build and fix compile errors
5. Implement discussion read/write flow
6. Implement showcase tipping flow
7. Implement bounty escrow/accept/refund flow
8. Add basic admin moderation

## Validation Checklist
- App starts with migrations applied
- `/api/community/posts` works
- `/community` renders
- `/community/:id` renders
- Sidebar entry navigates correctly
- Placeholder backend endpoints return success payloads
- No existing routes regress

## Notes
- Use `model.RecordLog(...)` for quota-moving actions.
- Keep all quota mutations in DB transactions.
- Phase 1 focuses on skeleton + safe business seams, not full polish.
