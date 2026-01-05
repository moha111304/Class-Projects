# CSCI 4131 Project: Showing off What you can Build! (Blogging Website)
**Ayub Mohamoud**

This project implements a blogging application using Node.js, Express, PUG, and MySQL, fulfilling all requirements 
up to the A-Grade, plus the bcrypt Extra Credit.

---
## 1. Launching and Configuration


### A. Prerequisites

1.  Node.js
2.  Dependencies: `npm install` must be run to install all required packages (`express`, `cookie-parser`, `pug`, `mysql2`, 
`bcrypt`).


### B. Configuration & Database Setup 

The server is configured to connect to your personal MySQL database via an SSH tunnel.

1.  **Start the SSH Tunnel:** Before running the server, you must open a separate terminal and execute the following command 
to start the tunnel:
    ```bash
    node tunnel.js
    ```
    (Then you will get prompt you for your UMN username and password.)

2.  **Database Connection:** The server connects to `127.0.0.1:3306` (localhost), as required for grading. The database 
credentials (user, password) are located inside `data.js`.

3.  **Schema and Seeding:** The schema.sql file contains the CREATE TABLE statements for Users, BlogPosts, and Comments. These 
statements must be executed against the database before the server is run. I used DBeaver to execute these statements, so the
tables should already exist in the database when testing begins.

4. **Environment Variables (.env):** For security, sensitive keys and ports are stored in a `.env` file (which is ignored by Git). Ensure your `.env` contains:
   ```text
   PORT=4131
   ADMIN_SECRET_PATH=csci-4131
   DB_USER=your_username
   DB_PASS=your_password
   ```


### C. Launching the Server

Once the SSH tunnel is active and tables created, open a second terminal and execute:

```bash
node server.js


### D. Admin User Creation
To begin testing admin features, please do the following immediately after launching the server:

First visit http://localhost:4131/register and create any new user (e.g., username: 'anything', password: 'anything').

Then visit http://localhost:4131/secret-admin-key/[YOUR_ADMIN_SECRET_PATH] (in the .env file) which will then sign you out and promote the user to admin