package main

import (
	"context"

	"github.com/gin-gonic/gin"
	pgx "github.com/jackc/pgx/v5"
)

type DashboardStats struct {
	TotalOrders        int      `json:"totalOrders"`
	ActiveOrders       int      `json:"activeOrders"`
	TotalUsers         int      `json:"totalUsers"`
	TotalSellers       int      `json:"totalSellers"`
	TotalDrivers       int      `json:"totalDrivers"`
	OnlineDrivers      int      `json:"onlineDrivers"`
	DeliveredToday     int      `json:"deliveredToday"`
	AvgDeliveryMinutes *float64 `json:"avgDeliveryMinutes"`
}

func handleDashboardStats(c *gin.Context) {
	ctx := context.Background()
	var stats DashboardStats

	db.QueryRow(ctx, "SELECT COUNT(*) FROM orders").Scan(&stats.TotalOrders)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM orders WHERE status NOT IN ('delivered', 'cancelled')").Scan(&stats.ActiveOrders)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = 'seller'").Scan(&stats.TotalSellers)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = 'driver'").Scan(&stats.TotalDrivers)
	db.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = 'driver' AND is_online = true").Scan(&stats.OnlineDrivers)
	db.QueryRow(ctx, `SELECT COUNT(*) FROM deliveries WHERE status = 'delivered' AND delivered_at >= NOW() - INTERVAL '1 day'`).Scan(&stats.DeliveredToday)

	c.JSON(200, stats)
}

func handleDashboardActivity(c *gin.Context) {
	rows, err := db.Query(context.Background(),
		"SELECT id, type, order_id, description, created_at FROM activity ORDER BY created_at DESC LIMIT 20")
	if err != nil {
		c.JSON(500, gin.H{"error": "DB error"})
		return
	}
	activities, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Activity, error) {
		var a Activity
		err := row.Scan(&a.ID, &a.Type, &a.OrderID, &a.Description, &a.CreatedAt)
		return a, err
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "Scan error"})
		return
	}
	if activities == nil {
		activities = []Activity{}
	}
	c.JSON(200, gin.H{"activities": activities})
}

func handleOrderStatusBreakdown(c *gin.Context) {
	rows, err := db.Query(context.Background(),
		"SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC")
	if err != nil {
		c.JSON(500, gin.H{"error": "DB error"})
		return
	}
	defer rows.Close()

	type StatusCount struct {
		Status string `json:"status"`
		Count  int    `json:"count"`
	}
	var breakdown []StatusCount
	for rows.Next() {
		var sc StatusCount
		rows.Scan(&sc.Status, &sc.Count)
		breakdown = append(breakdown, sc)
	}
	if breakdown == nil {
		breakdown = []StatusCount{}
	}
	c.JSON(200, gin.H{"breakdown": breakdown})
}
