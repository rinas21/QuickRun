package main

import (
	"context"
	"strings"

	"github.com/gin-gonic/gin"
)

func requireAuth(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	userID, err := verifyToken(authHeader[7:])
	if err != nil {
		c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	var user User
	var passwordHash string
	err = db.QueryRow(context.Background(),
		`SELECT id, name, email, phone, password_hash, role, is_active, is_online, latitude, longitude, created_at
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Phone, &passwordHash,
		&user.Role, &user.IsActive, &user.IsOnline, &user.Latitude, &user.Longitude, &user.CreatedAt)

	if err != nil || !user.IsActive {
		c.AbortWithStatusJSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	c.Set("user", user)
	c.Next()
}

func requireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.MustGet("user").(User)
		for _, r := range roles {
			if user.Role == r {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(403, gin.H{"error": "Forbidden"})
	}
}
