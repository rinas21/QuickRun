package main

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
)

func handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "quickrun-api-go"})
}

func handleRegister(c *gin.Context) {
	var body struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required"`
		Phone    string `json:"phone" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}
	if body.Role == "" {
		body.Role = "buyer"
	}

	var count int
	db.QueryRow(context.Background(), "SELECT COUNT(*) FROM users WHERE email = $1", body.Email).Scan(&count)
	if count > 0 {
		c.JSON(409, gin.H{"error": "Email already registered"})
		return
	}

	hash, err := hashPassword(body.Password)
	if err != nil {
		c.JSON(500, gin.H{"error": "Server error"})
		return
	}

	var user User
	err = db.QueryRow(context.Background(),
		`INSERT INTO users (name, email, phone, password_hash, role)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, name, email, phone, role, is_active, is_online, latitude, longitude, created_at`,
		body.Name, body.Email, body.Phone, hash, body.Role,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Phone, &user.Role,
		&user.IsActive, &user.IsOnline, &user.Latitude, &user.Longitude, &user.CreatedAt)
	if err != nil {
		c.JSON(500, gin.H{"error": "Server error"})
		return
	}

	token, err := signToken(user.ID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Server error"})
		return
	}
	c.JSON(201, gin.H{"user": user, "token": token})
}

func handleLogin(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "Invalid input"})
		return
	}

	var user User
	var passwordHash string
	err := db.QueryRow(context.Background(),
		`SELECT id, name, email, phone, password_hash, role, is_active, is_online, latitude, longitude, created_at
		 FROM users WHERE email = $1`,
		body.Email,
	).Scan(&user.ID, &user.Name, &user.Email, &user.Phone, &passwordHash,
		&user.Role, &user.IsActive, &user.IsOnline, &user.Latitude, &user.Longitude, &user.CreatedAt)
	if err != nil {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
		return
	}

	if !checkPassword(body.Password, passwordHash) {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
		return
	}

	if !user.IsActive {
		c.JSON(403, gin.H{"error": "Account is deactivated"})
		return
	}

	token, err := signToken(user.ID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Server error"})
		return
	}
	c.JSON(200, gin.H{"user": user, "token": token})
}

func handleLogout(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Logged out successfully"})
}

func handleMe(c *gin.Context) {
	user := c.MustGet("user").(User)
	c.JSON(200, user)
}
