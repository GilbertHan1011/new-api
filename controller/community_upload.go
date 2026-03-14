package controller

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

var allowedImageExts = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".webp": true,
}

const communityUploadDir = "web/public/community-uploads"
const maxUploadSize = 5 << 20 // 5MB

func CommunityUploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		common.ApiErrorMsg(c, "file is required")
		return
	}

	if file.Size > maxUploadSize {
		common.ApiErrorMsg(c, "file size exceeds 5MB limit")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedImageExts[ext] {
		common.ApiErrorMsg(c, "only jpg, jpeg, png, gif, webp files are allowed")
		return
	}

	randomBytes := make([]byte, 8)
	_, _ = rand.Read(randomBytes)
	filename := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), hex.EncodeToString(randomBytes), ext)

	if err := os.MkdirAll(communityUploadDir, 0755); err != nil {
		common.ApiError(c, err)
		return
	}

	savePath := filepath.Join(communityUploadDir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"url": "/api/community/uploads/" + filename,
	})
}

func CommunityServeUpload(c *gin.Context) {
	filename := c.Param("filename")
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		common.ApiErrorMsg(c, "invalid filename")
		return
	}

	filePath := filepath.Join(communityUploadDir, filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		common.ApiErrorMsg(c, "file not found")
		return
	}

	c.Header("Cache-Control", "public, max-age=86400")
	c.File(filePath)
}
