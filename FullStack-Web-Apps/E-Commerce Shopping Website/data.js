const mysql = require("mysql2/promise");

var connPool = mysql.createPool({
  connectionLimit: 5, // it's a shared resource, let's not go nuts.
  host: "127.0.0.1", // this will work
  user: "C4131F25U166", // user
  database: "C4131F25U166", // database
  password: "27606", // we really shouldn't be saving this here long-term -- and I probably shouldn't be sharing it with you...
});

// Utility function to calculate cost
const PRODUCTS = {
    "Vintage Silver-Grey Browline": 110.00, "Silver Metal Square": 75.00, "Matte Black Aviator": 50.00,
    "The Sentinel Bifocal": 150.00, "The Aviator Classic": 85.00,
};

function calculateCost(productName, quantity) {
    const price = PRODUCTS[productName] || 0;
    return price * quantity;
}
const SHIP_DURATION_SECONDS = 300; // 5 minutes

const mapOrderKeys = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        status: row.status,
        cost: parseFloat(row.order_cost),
        from: row.from_name,                  
        address: row.address,
        product: row.product_name,            
        quantity: row.quantity,
        shipping: row.shipping_method,        
        order_date: row.order_date,
    };
};

// Adds a new order and records initial state history
async function addOrder(data) {
    const cost = calculateCost(data.product, data.quantity); 

    const conn = await connPool.getConnection();
    try {
        await conn.beginTransaction();

        // Insert into Orders table
        const [result] = await conn.execute(
            `INSERT INTO Orders (from_name, address, product_name, quantity, shipping_method, order_cost, status, order_date) 
            VALUES (?, ?, ?, ?, ?, ?, 'Placed', NOW())`,
            [data.from_name, data.address, data.product, data.quantity, data.shipping, cost]
        );
        const newOrderId = result.insertId;

        // Insert initial state into OrderHistories table
        await conn.execute(
            `INSERT INTO OrderHistories (order_id, shipping_method_used, delivery_address)
            VALUES (?, ?, ?)`,
            [newOrderId, data.shipping, data.address]
        );

        await conn.commit();
        // Return the mapped object to the server
        return mapOrderKeys(await getOrder(newOrderId)); 
    } catch (error) {
        await conn.rollback();
        console.error("Error adding order:", error);
        throw error;
    } finally {
        conn.release();
    }
}

// Retrieves a list of orders based on query
async function getOrders(query, status) {
   let sql = 'SELECT * FROM Orders WHERE 1=1';
    const params = [];

    if (query) {
        sql += ' AND from_name LIKE ?';
        params.push(`%${query}%`);
    }

    if (status && status !== 'All') {
        sql += ' AND status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY id ASC'; 

    const [rows] = await connPool.execute(sql, params);
    return rows.map(mapOrderKeys);
}

// Updates address and/or shipping method
async function updateOrder(id, shipping, address) {
    const conn = await connPool.getConnection();
    
    try {
        await conn.beginTransaction();
        
        // Update the Orders table
        const [result] = await conn.execute(
            'UPDATE Orders SET shipping_method = ?, address = ? WHERE id = ? AND status IN ("Placed", "Shipped")',
            [shipping, address, id]
        );

        // Check if order was actually updated (if affectedRows > 0)
        if (result.affectedRows > 0) {
            // Insert the new state into OrderHistories table
            await conn.execute(
                `INSERT INTO OrderHistories (order_id, shipping_method_used, delivery_address)
                VALUES (?, ?, ?)`,
                [id, shipping, address]
            );
        }
        
        await conn.commit();
        return result.affectedRows > 0;
    } catch (error) {
        await conn.rollback();
        console.error("Error updating order:", error);
        throw error;
    } finally {
        conn.release();
    }
}

// Cancels the order
async function cancelOrder(id) {
    const [result] = await connPool.execute(
        'UPDATE Orders SET status = "Cancelled" WHERE id = ? AND status IN ("Placed", "Shipped")',
        [id]
    );
    return result.affectedRows > 0;
}

// Retrieves a single order by ID
async function getOrder(orderId) {
    const [rows] = await connPool.execute('SELECT * FROM Orders WHERE id = ?', [orderId]);
    return rows.length ? mapOrderKeys(rows[0]) : null;
}

// Updates order status from 'Placed' to 'Shipped' based on time
async function updateOrderStatuses() {
    // "lazy update" required 
    const [result] = await connPool.execute(
        `UPDATE Orders 
        SET status = 'Shipped' 
        WHERE status = 'Placed' 
        AND order_date < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [SHIP_DURATION_SECONDS]
    );
    return result.affectedRows;
}

// Retrieves the 5 most recent shipping updates
async function getOrderHistory(id) {
    const [rows] = await connPool.execute(
        `SELECT update_time, shipping_method_used, delivery_address 
        FROM OrderHistories 
        WHERE order_id = ?
        ORDER BY update_time DESC
        LIMIT 5`,
        [id]
    );
    // Since this is an API, simple JSON stringify is used (no heavy mapping needed)
    return rows.map(row => JSON.parse(JSON.stringify(row))); 
}

module.exports = {
  getOrder,
  addOrder,
  getOrders,
  updateOrderStatuses,
  updateOrder,
  cancelOrder,
  getOrderHistory,
};