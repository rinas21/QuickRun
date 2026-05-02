package main

import (
	"context"
	"strconv"

	"github.com/gin-gonic/gin"
	pgx "github.com/jackc/pgx/v5"
)

const userCols = `id, name, email, phone, role, is_active, is_online, latitude, longitude, created_at`

func scanUser(row pgx.CollectableRow) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Role,
		&u.IsActive, &u.IsOnline, &u.Latitude, &u.Longitude, &u.CreatedAt)
	return u, err
}

func handleListUsers(c *gin.Context) {
	role := c.Query("role")
	var rows pgx.Rows
	var err error
	ctx := context.Background()

	if role != "" {
		rows, err = db.Query(ctx,
			"SELECT "+userCols+" FROM users WHERE role = $1 ORDER BY created_at DESC", role)
	} else {
		rows, err = db.Query(ctx,
			"SELECT "+userCols+" FROM users ORDER BY created_at DESC")
	}
	if err != nil {
		c.JSON(500, gin.H{"error": "DB error"})
		return
	}
	users, err := pgx.CollectRows(rows, scanUser)
	if err != nil {
		c.JSON(500, gin.H{"error": "Scan error"})
		return
	}
	if users == nil {
		users = []User{}
	}
	c.JSON(200, gin.H{"users": users, "total": len(users)})
}

func handleUpdateUserStatus(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}
	var body struct {
		IsActive bool `json:"isActive"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "isActive required"})
		return
	}
	_, err = db.Exec(context.Background(),
		"UPDATE users SET is_active = $1 WHERE id = $2", body.IsActive, userID)
	if err != nil {
		c.JSON(500, gin.H{"error": "DB error"})
		return
	}
	c.JSON(200, gin.H{"message": "User status updated"})
}

func handleListAvailableDrivers(c *gin.Context) {
	rows, err := db.Query(context.Background(),
		"SELECT "+userCols+" FROM users WHERE role = 'driver' AND is_active = true AND is_online = true ORDER BY name")
	if err != nil {
		c.JSON(500, gin.H{"error": "DB error"})
		return
	}
	drivers, err := pgx.CollectRows(rows, scanUser)
	if err != nil {
		c.JSON(500, gin.H{"error": "Scan error"})
		return
	}
	if drivers == nil {
		drivers = []User{}
	}
	c.JSON(200, gin.H{"drivers": drivers})
}
