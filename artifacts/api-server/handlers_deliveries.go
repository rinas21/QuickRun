package main

import (
        "context"
        "errors"
        "strconv"
        "time"

        "github.com/gin-gonic/gin"
        pgx "github.com/jackc/pgx/v5"
)

const deliveryCols = `id, order_id, driver_id, offer_id, status, driver_latitude, driver_longitude, picked_up_at, delivered_at, created_at, updated_at`

func scanDelivery(row pgx.CollectableRow) (Delivery, error) {
        var d Delivery
        err := row.Scan(&d.ID, &d.OrderID, &d.DriverID, &d.OfferID,
                &d.Status, &d.DriverLatitude, &d.DriverLongitude,
                &d.PickedUpAt, &d.DeliveredAt, &d.CreatedAt, &d.UpdatedAt)
        return d, err
}

func handleListDeliveries(c *gin.Context) {
        user := c.MustGet("user").(User)
        ctx := context.Background()

        var query string
        var args []interface{}

        base := "SELECT " + deliveryCols + " FROM deliveries"

        if user.Role == "driver" {
                query = base + " WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 50"
                args = []interface{}{user.ID}
        } else {
                query = base + " ORDER BY created_at DESC LIMIT 50"
        }

        rows, err := db.Query(ctx, query, args...)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        deliveries, err := pgx.CollectRows(rows, scanDelivery)
        if err != nil {
                c.JSON(500, gin.H{"error": "Scan error"})
                return
        }
        if deliveries == nil {
                deliveries = []Delivery{}
        }
        c.JSON(200, gin.H{"deliveries": deliveries})
}

func getDeliveryDetail(ctx context.Context, deliveryID int) (*DeliveryDetail, error) {
        var d DeliveryDetail
        err := db.QueryRow(ctx, `
                SELECT
                        dv.id, dv.order_id, dv.driver_id, dv.offer_id, dv.status,
                        dv.driver_latitude, dv.driver_longitude,
                        dv.picked_up_at, dv.delivered_at, dv.created_at, dv.updated_at,
                        dr.id, dr.name, dr.phone,
                        o.id, o.item_description, o.delivery_address, o.delivery_latitude, o.delivery_longitude,
                        bu.id, bu.name, bu.phone,
                        of.id, of.price,
                        se.id, se.name, se.phone
                FROM deliveries dv
                JOIN users dr    ON dr.id = dv.driver_id
                JOIN orders o    ON o.id  = dv.order_id
                JOIN users bu    ON bu.id = o.buyer_id
                JOIN offers of   ON of.id = dv.offer_id
                JOIN users se    ON se.id = of.seller_id
                WHERE dv.id = $1`, deliveryID,
        ).Scan(
                &d.ID, &d.OrderID, &d.DriverID, &d.OfferID, &d.Status,
                &d.DriverLatitude, &d.DriverLongitude,
                &d.PickedUpAt, &d.DeliveredAt, &d.CreatedAt, &d.UpdatedAt,
                &d.Driver.ID, &d.Driver.Name, &d.Driver.Phone,
                &d.Order.ID, &d.Order.ItemDescription, &d.Order.DeliveryAddress,
                &d.Order.DeliveryLatitude, &d.Order.DeliveryLongitude,
                &d.Order.Buyer.ID, &d.Order.Buyer.Name, &d.Order.Buyer.Phone,
                &d.Offer.ID, &d.Offer.Price,
                &d.Offer.Seller.ID, &d.Offer.Seller.Name, &d.Offer.Seller.Phone,
        )
        return &d, err
}

func handleGetDelivery(c *gin.Context) {
        deliveryID, err := strconv.Atoi(c.Param("deliveryId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid delivery ID"})
                return
        }
        d, err := getDeliveryDetail(context.Background(), deliveryID)
        if errors.Is(err, pgx.ErrNoRows) {
                c.JSON(404, gin.H{"error": "Delivery not found"})
                return
        }
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }
        c.JSON(200, d)
}

func handleUpdateDeliveryStatus(c *gin.Context) {
        deliveryID, err := strconv.Atoi(c.Param("deliveryId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid delivery ID"})
                return
        }

        var body struct {
                Status string `json:"status" binding:"required"`
        }
        if err := c.ShouldBindJSON(&body); err != nil {
                c.JSON(400, gin.H{"error": "status is required"})
                return
        }

        ctx := context.Background()

        if body.Status == "delivered" {
                now := time.Now()
                _, err = db.Exec(ctx,
                        `UPDATE deliveries SET status = $1, delivered_at = $2, updated_at = NOW() WHERE id = $3`,
                        body.Status, now, deliveryID)
                if err == nil {
                        // Update the order status too
                        var orderID int
                        db.QueryRow(ctx, "SELECT order_id FROM deliveries WHERE id = $1", deliveryID).Scan(&orderID)
                        db.Exec(ctx, "UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = $1", orderID)
                        db.Exec(ctx, "INSERT INTO activity (type, order_id, description) VALUES ('delivered', $1, 'Order delivered successfully')", orderID)
                }
        } else if body.Status == "picking_up" {
                now := time.Now()
                _, err = db.Exec(ctx,
                        `UPDATE deliveries SET status = $1, picked_up_at = $2, updated_at = NOW() WHERE id = $3`,
                        body.Status, now, deliveryID)
        } else {
                _, err = db.Exec(ctx,
                        `UPDATE deliveries SET status = $1, updated_at = NOW() WHERE id = $2`,
                        body.Status, deliveryID)
        }

        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }

        d, _ := getDeliveryDetail(ctx, deliveryID)
        c.JSON(200, d)
}

func handleUpdateDriverLocation(c *gin.Context) {
        deliveryID, err := strconv.Atoi(c.Param("deliveryId"))
        if err != nil {
                c.JSON(400, gin.H{"error": "Invalid delivery ID"})
                return
        }

        var body struct {
                Latitude  float64 `json:"latitude" binding:"required"`
                Longitude float64 `json:"longitude" binding:"required"`
        }
        if err := c.ShouldBindJSON(&body); err != nil {
                c.JSON(400, gin.H{"error": "latitude and longitude required"})
                return
        }

        ctx := context.Background()
        _, err = db.Exec(ctx,
                `UPDATE deliveries SET driver_latitude = $1, driver_longitude = $2, updated_at = NOW() WHERE id = $3`,
                body.Latitude, body.Longitude, deliveryID)
        if err != nil {
                c.JSON(500, gin.H{"error": "DB error"})
                return
        }

        // Also update driver's location in users table
        user := c.MustGet("user").(User)
        db.Exec(ctx, "UPDATE users SET latitude = $1, longitude = $2 WHERE id = $3",
                body.Latitude, body.Longitude, user.ID)

        c.JSON(200, gin.H{"message": "Location updated"})
}
