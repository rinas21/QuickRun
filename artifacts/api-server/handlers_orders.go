package main

import (
        "context"
        "errors"
        "fmt"
        "strconv"

        "github.com/gin-gonic/gin"
        pgx "github.com/jackc/pgx/v5"
)

const orderCols = `id, buyer_id, item_description, delivery_address, delivery_latitude, delivery_longitude, status, notes, final_price, selected_offer_id, created_at, updated_at`

func scanOrder(row pgx.CollectableRow) (Order, error) {
        var o Order
        err := row.Scan(&o.ID, &o.BuyerID, &o.ItemDescription, &o.DeliveryAddress,
                &o.DeliveryLatitude, &o.DeliveryLongitude, &o.Status, &o.Notes,
                &o.FinalPrice, &o.SelectedOfferID, &o.CreatedAt, &o.UpdatedAt)
        return o, err
}

func scanOrderRow(row pgx.Row) (Order, error) {
        var o Order
        err := row.Scan(&o.ID, &o.BuyerID, &o.ItemDescription, &o.DeliveryAddress,
                &o.DeliveryLatitude, &o.DeliveryLongitude, &o.Status, &o.Notes,
                &o.FinalPrice, &o.SelectedOfferID, &o.CreatedAt, &o.UpdatedAt)
        return o, err
}

func handleListOrders(c *gin.Context) {
        user := c.MustGet("user").(User)
        ctx := context.Background()
        statusFilter := c.Query("status")

        var query string
        var args []interface{}

        base := "SELECT " + orderCols + " FROM orders"

        if user.Role == "buyer" {
                if statusFilter != "" {
                        query = base + " WHERE buyer_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 50"
                        args = []interface{}{user.ID, statusFilter}
                } else {
                        query = base + " WHERE buyer_id = $1 ORDER BY created_at DESC LIMIT 50"
                        args = []interface{}{user.ID}
                }
        } else {
                if statusFilter != "" {
                        query = base + " WHERE status = $1 ORDER BY created_at DESC LIMIT 50"
                        args = []interface{}{statusFilter}
                } else {
                        query = base + " ORDER BY created_at DESC LIMIT 50"
                }
        }

        rows, err := db.Query(ctx, query, args...)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        orders, err := pgx.CollectRows(rows, scanOrder)
        if err != nil {
                c.JSON(500, gin.H{"error": "Scan error"})
                return
        }
        if orders == nil {
                orders = []Order{}
        }
        c.JSON(200, gin.H{"orders": orders, "total": len(orders)})
}

func handleCreateOrder(c *gin.Context) {
        user := c.MustGet("user").(User)
        var body struct {
                ItemDescription   string   `json:"itemDescription" binding:"required"`
                DeliveryAddress   string   `json:"deliveryAddress" binding:"required"`
                DeliveryLatitude  *float64 `json:"deliveryLatitude"`
                DeliveryLongitude *float64 `json:"deliveryLongitude"`
                Notes             *string  `json:"notes"`
        }
        if err := c.ShouldBindJSON(&body); err != nil {
                c.JSON(400, gin.H{"error": "Invalid input"})
                return
        }

        row := db.QueryRow(context.Background(),
                `INSERT INTO orders (buyer_id, item_description, delivery_address, delivery_latitude, delivery_longitude, notes, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'collecting_offers')
                 RETURNING `+orderCols,
                user.ID, body.ItemDescription, body.DeliveryAddress,
                body.DeliveryLatitude, body.DeliveryLongitude, body.Notes,
        )
        o, err := scanOrderRow(row)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }

        db.Exec(context.Background(),
                "INSERT INTO activity (type, order_id, description) VALUES ('order_created', $1, $2)",
                o.ID, fmt.Sprintf(`New request: "%s"`, o.ItemDescription),
        )

        c.JSON(201, o)
}

func handleGetOrder(c *gin.Context) {
        orderID, err := strconv.Atoi(c.Param("orderId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid order ID"})
                return
        }

        ctx := context.Background()
        row := db.QueryRow(ctx, "SELECT "+orderCols+" FROM orders WHERE id = $1", orderID)
        o, err := scanOrderRow(row)
        if errors.Is(err, pgx.ErrNoRows) {
                c.JSON(404, gin.H{"error": "Order not found"})
                return
        }
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }

        result := OrderWithDelivery{Order: o}

        // Attach delivery if one exists for this order
        var delRef OrderDeliveryRef
        err = db.QueryRow(ctx,
                `SELECT id, status, driver_latitude, driver_longitude FROM deliveries WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
                orderID,
        ).Scan(&delRef.ID, &delRef.Status, &delRef.DriverLatitude, &delRef.DriverLongitude)
        if err == nil {
                result.Delivery = &delRef
        }

        c.JSON(200, result)
}

func handleCancelOrder(c *gin.Context) {
        user := c.MustGet("user").(User)
        orderID, err := strconv.Atoi(c.Param("orderId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid order ID"})
                return
        }

        var buyerID int
        err = db.QueryRow(context.Background(),
                "SELECT buyer_id FROM orders WHERE id = $1", orderID).Scan(&buyerID)
        if errors.Is(err, pgx.ErrNoRows) {
                c.JSON(404, gin.H{"error": "Order not found"})
                return
        }
        if user.Role != "admin" && buyerID != user.ID {
                c.JSON(403, gin.H{"error": "Forbidden"})
                return
        }

        _, err = db.Exec(context.Background(),
                "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1", orderID)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        c.JSON(200, gin.H{"message": "Order cancelled"})
}
