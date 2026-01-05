CREATE TABLE Orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_name VARCHAR(64) NOT NULL,
    address TEXT NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    shipping_method VARCHAR(50) NOT NULL,
    order_cost DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    order_date DATETIME NOT NULL DEFAULT NOW() 
);

CREATE TABLE OrderHistories (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    shipping_method_used VARCHAR(50),
    delivery_address TEXT,
    update_time DATETIME NOT NULL DEFAULT NOW(), 
    FOREIGN KEY (order_id) REFERENCES Orders(id) 
);