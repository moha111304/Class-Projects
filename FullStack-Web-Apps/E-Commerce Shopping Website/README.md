# CSCI 4131 Project: Full-Stack Order Management System (Shopping Website)
**Ayub Mohamoud**

This project implements a functional e-commerce storefront for eyewear using Node.js, Express, PUG, and MySQL. It features real-time order tracking, an admin management portal, and dynamic shipping calculations.

---

## 1. Launching and Configuration

### A. Prerequisites
1. **Node.js**
2. **Dependencies:** `npm install` must be run to install required packages (`express`, `cookie-parser`, `pug`, `mysql2`, `dotenv`).

### B. Configuration & Database Setup 
The server connects to the UMN MySQL database via an SSH tunnel for secure data management.

1. **Start the SSH Tunnel:** Open a separate terminal and execute:
    ```bash
    node tunnel.js
    ```
    (You will be prompted for your UMN username and password.)

2. **Database Connection:** The server connects to `127.0.0.1:3306`. Database credentials and secret routes are managed via the `.env` file.

3. **Schema and Seeding:** The `schema.sql` file contains the CREATE TABLE statements for Orders and Order History. These must be executed (e.g., via DBeaver) before running the server.

4. **Environment Variables (.env):** For security, sensitive keys and ports are stored in a `.env` file (which is ignored by Git). Ensure your `.env` contains:
    ```text
    PORT=4131
    ADMIN_ORDER_PATH=orders-secret-key
    DB_USER=your_username
    DB_PASS=your_password
    ```

### C. Launching the Server
Once the SSH tunnel is active and the database is ready, run:
```bash
node server.js