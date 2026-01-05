# Full-Stack Web Development Portfolio
**Ayub Mohamoud**

This directory contains two major full-stack projects developed for CSCI 4131. Both applications utilize a **Node.js/Express** backend, **Pug** templating for the frontend, and a **MySQL** database.


## 📂 Projects Overview

### 1. [Blogging Website](./Blog-Post%20Website)
A content management system featuring user authentication (Bcrypt), admin escalation routes, and interactive commenting.
- **Key Skills:** Password hashing, Middleware authorization, XSS prevention.

### 2. [E-Commerce Shopping Website](./E-Commerce%20Shopping%20Website)
A storefront application featuring a dynamic order pipeline, live tracking countdowns, and an admin order-management dashboard.
- **Key Skills:** RESTful API design (POST/PUT/DELETE), Session management via cookies, SSH tunneling.

## Security & Setup Note
For security purposes, both projects utilize **Environment Variables** (`.env` files) to handle sensitive data like database credentials and secret admin URLs. These files are excluded from the repository.

To run either project:
1. Navigate to the specific project folder.
2. Run `npm install`.
3. Configure the `.env` file based on the instructions in that folder's specific README.
4. Establish the SSH tunnel using `node tunnel.js`.
5. Start the application with `node server.js`.