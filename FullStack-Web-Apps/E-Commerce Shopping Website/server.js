require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const data = require('./data');
const app = express();
const PORT = process.env.PORT || 4131;


// Global Data AND Helper Functions

const PRODUCTS = {
    "Vintage Silver-Grey Browline": 110.00,
    "Silver Metal Square": 75.00,
    "Matte Black Aviator": 50.00,
    "The Sentinel Bifocal": 150.00,
    "The Aviator Classic": 85.00,
};

const VALID_SHIPPING_API = new Set(["Flat Rate", "Ground", "Expedited"]);
const VALID_PRODUCTS_API = new Set(Object.keys(PRODUCTS));

// Helper functions

function typesetDollars(number) {
    const cost = parseFloat(number);
    if (isNaN(cost)) {
        return '$0.00'; // Return safe value if input is invalid
    }
    return `$${cost.toFixed(2)}`;
}

function formatDateForClient(date) {
if (!(date instanceof Date) || isNaN(date)) {
        return date; // Return non-date objects as-is
    }
    
    const localTime = date.getTime();
    const offset = date.getTimezoneOffset() * 60000;
    const adjustedTime = localTime - offset;
    const dateWithoutOffset = new Date(adjustedTime);
    return dateWithoutOffset.toISOString().replace(/\.\d{3}Z$/, '');
}

function escapeHtml(s) {
    if (typeof s !== 'string') s = String(s);
    return s.replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/'/g, "&#39;");
}

function sanitizeCookieValue(name) {
    if (typeof name !== 'string') name = String(name);
    return name.replace(/[^a-zA-Z0-9-]/g, '').trim();
}

// Middleware

// Configure PUG view engine and views directory
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'templates')); 

// Middleware for static files (Task 1: New URL structure)
app.use(express.static('resources'));

// Middleware for parsing POST bodies
app.use(express.json()); // For application/json (APIs)
app.use(express.urlencoded({ extended: true })); // For application/x-www-form-urlencoded (Forms)
app.use(cookieParser()); // For reading req.cookies

// --- Helper Middleware (For extra credit) ---
async function requestLogger(req, res, next) {
    const originalEnd = res.end;

    // We fetch the count early in case the main route crashes (though it might still be inaccurate)
    let orderCount = 'N/A (DB Unavailable)';
    try {
        const allOrders = await data.getOrders('', '');
        orderCount = allOrders.length;
    } catch (e) {
        // Ignore DB connection errors during logging
    }

    res.end = function (chunk, encoding) {
        res.end = originalEnd; 
        res.end(chunk, encoding);

        const logLine = (
            `Method: ${req.method} | ` +
            `URL: ${req.originalUrl} | ` +
            `Status: ${res.statusCode} | ` +
            `Orders Count: ${orderCount}` 
        );
        console.log(logLine);
    };
    
    next();
}

// --- Helper Middleware (For order status updates) ---
async function updateOrderStatus(req, res, next) {
    // Only update statuses for requests that rely on up-to-date data
    if (req.path.startsWith(`/admin/${process.env.ADMIN_ORDER_PATH}`) || req.path.startsWith('/tracking/')) {
        try {
            await data.updateOrderStatuses(); 
        } catch (e) {
            console.error("Failed to update order statuses:", e);
        }
    }
    next();
}

app.use(requestLogger);
app.use(updateOrderStatus);

// Server Routes

// GET Routes

app.get(['/', '/about'], (req, res) => {
    res.render('about');
});

app.get('/order', (req, res) => {
    const customerName = req.cookies.customer_name || '';

    res.render('order', {
        products: PRODUCTS,
        customerName: customerName,
    });
});

app.get(`/admin/${process.env.ADMIN_ORDER_PATH}`, async (req, res) => {
    try {
        const query = req.query.query || '';
        const statusFilter = req.query.status || '';
        
        const filteredOrders = await data.getOrders(query, statusFilter); 

        res.render('admin/orders', {
            orders: filteredOrders,
            query: query,
            statusFilter: statusFilter,
            typesetDollars: typesetDollars,
            escapeHtml: escapeHtml,
        });
    } catch (e) {
        console.error("Database or Rendering Error:", e);
        res.status(500).render('500', { error: "Database error during order listing." }); 
    }
});

app.get('/tracking/:id', async (req, res) => { // CONVERTED TO ASYNC
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
        return res.status(404).render('404', { message: "Invalid tracking ID format." });
    }

    const order = await data.getOrder(orderId);

    // Check if order exists (404)
    if (!order) {
        return res.status(404).render('404', { message: "Order not found." });
    }

    const renderOrder = {
        ...order,
        order_date: formatDateForClient(order.order_date) 
    };

    res.render('tracking', {
        order: renderOrder, // Pass the corrected object
        typesetDollars: typesetDollars,
        escapeHtml: escapeHtml,
    });
});

// Get Order History
app.get('/api/order/:id/history', async (req, res) => { 
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
        return res.status(400).json({ error: "Invalid Order ID format." });
    }

    try {
        const history = await data.getOrderHistory(orderId);
        
        if (history.length === 0) {
             // Check if the order itself exists to distinguish between 404 and empty history
            const order = await data.getOrder(orderId);
            if (!order) {
                return res.status(404).json({ error: "Order not found." });
            }
             // If order exists but the history is empty
            return res.json([]);
        }
        
        res.json(history);
    } catch (e) {
        console.error("Database error fetching history:", e);
        res.status(500).json({ error: "Internal server error." });
    }
});

// POST/DELETE Routes

app.post('/api/order', async (req, res) => { // CONVERTED TO ASYNC
    // Check for undefined immediately
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ status: "error", errors: ["Invalid JSON format or body is missing."] });
    }

    const orderData = req.body;
    const errors = [];

    // Check for Content Too Large (413)
    const fromName = String(orderData.from_name || "");
    const address = String(orderData.address || "");

    if (fromName.length >= 64 || address.length >= 1024) {
        return res.status(413).json({ status: "error", errors: ["Payload Too Large: Name or Address is too long."] });
    }

    // Validate required properties and types (400)
    const requiredProps = ["product", "from_name", "quantity", "address", "shipping"];
    
    if (errors.length === 0) {
        // Check for missing/empty fields
        requiredProps.forEach(prop => {
            if (!orderData[prop]) {
                errors.push(`Missing required property: ${prop}.`);
            }
        });
        
        // Validate product
        if (!VALID_PRODUCTS_API.has(orderData.product)) {
            errors.push("Unrecognized product.");
        }
        
        // Validate shipping
        if (!VALID_SHIPPING_API.has(orderData.shipping)) {
            errors.push("Invalid shipping method.");
        }

        // Validate quantity
        if (typeof orderData.quantity !== 'number' || orderData.quantity <= 0) {
            errors.push("Quantity must be a positive integer.");
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({ status: "error", errors: errors });
    }

    // SUCCESS (201 Created)
    try {
        const newOrderResult = await data.addOrder(orderData);
        
        const customerNameSafe = sanitizeCookieValue(fromName);
        res.cookie('customer_name', customerNameSafe, { path: '/', maxAge: 3600000 }); // 1 hour maxAge
        
        // newOrderResult contains the new ID from the database
        res.status(201).json({ status: "success", order_id: newOrderResult.id });

    } catch (e) {
        console.error("Database error during POST /api/order:", e);
        res.status(500).json({ status: "error", errors: ["Internal database error placing order."] });
    }
});

app.delete('/api/cancel_order', async (req, res) => {
    const orderId = parseInt(req.body.order_id);

    if (isNaN(orderId)) {
        return res.status(400).send("");
    }

    try {
        const success = await data.cancelOrder(orderId);

        if (!success) {
            // Check if the order exists (404) or was ineligible (400)
            const order = await data.getOrder(orderId);

            if (!order) {
                return res.status(404).send(""); // 404 Check
            } else {
                // If order exists but failed, it was ineligible (Shipped/Delivered/Cancelled)
                return res.status(400).send(""); // 400 Check
            }
        }
        
        // Success (204 No Content)
        res.sendStatus(204); 

    } catch (e) {
        console.error("Database error during DELETE /api/cancel_order:", e);
        res.status(500).send("Server Error");
    }
});

app.post('/update_shipping', async (req, res) => {
    const params = req.body;
    const orderId = parseInt(params.id);

    // Check for required fields / malformed input (400)
    if (isNaN(orderId) || !params.shipping || !params.address) {
        return res.status(400).render('order_fail'); 
    }

    try {
        const success = await data.updateOrder(orderId, params.shipping, params.address);

        if (success) {
            const updatedOrder = await data.getOrder(orderId); 
            
            const renderOrder = {
                ...updatedOrder,
                order_date: formatDateForClient(updatedOrder.order_date) 
            };

            return res.render('tracking', {
                order: renderOrder,
                typesetDollars: typesetDollars,
                escapeHtml: escapeHtml,
            });
        } else {
            // Order not found or ineligible
            return res.status(400).render('order_fail');
        }
    } catch (e) {
        console.error("Database error during POST /update_shipping:", e);
        res.status(500).render('500', { error: "Database error during shipping update." });
    }
});

// 404 Route

app.use((req, res) => {
    // Status 404 and render the 404 PUG template
    res.status(404).render('404', { message: "The requested resource was not found." });
});


// Start Server at 4131 Port

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});