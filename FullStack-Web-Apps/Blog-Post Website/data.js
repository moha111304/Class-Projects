const mysql = require('mysql2/promise');

var connPool = mysql.createPool({
  connectionLimit: 5, // it's a shared resource, let's not go nuts.
  host: "127.0.0.1", // this will work
  user: "C4131F25U166", // user
  database: "C4131F25U166", // database
  password: "27606", // we really shouldn't be saving this here long-term -- and I probably shouldn't be sharing it with you...
});

// User/Auth Functions

/**
 * Creates a new user account. New accounts are created as non-admins.
 */
async function createUser(username, passwordHash) {
    const sql = `
        INSERT INTO Users (username, password_hash, is_admin)
        VALUES (?, ?, 0);
    `;
    const [result] = await connPool.execute(sql, [username, passwordHash]);
    return result.insertId;
}

/**
 * Retrieves a user by their username for login.
 */
async function getUserByUsername(username) {
    const sql = `
        SELECT id, username, password_hash, is_admin
        FROM Users
        WHERE username = ?;
    `;
    const [rows] = await connPool.execute(sql, [username]);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Retrieves a user by their ID.
 */
async function getUserById(userId) {
    const parsedId = parseInt(userId);
    
    // Safety check: if parsing failed, return null immediately
    if (isNaN(parsedId)) return null;

    const sql = `
        SELECT id, username, password_hash, is_admin
        FROM Users
        WHERE id = ?;
    `;
    const [rows] = await connPool.execute(sql, [userId]);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Escalates a user to admin status.
 */
async function escalateToAdmin(userId) {
    const sql = `
        UPDATE Users
        SET is_admin = 1
        WHERE id = ? AND is_admin = 0;
    `;
    const [result] = await connPool.execute(sql, [userId]);
    return result.affectedRows > 0;
}


// Blog Post Functions

/**
 * Gets the total count of posts.
 */
async function getTotalPostsCount() {
    const sql = `SELECT COUNT(*) AS count FROM BlogPosts;`;
    const [rows] = await connPool.execute(sql);
    return rows[0].count;
}

/**
 * Creates a new blog post.
 */
async function createPost(title, blogText, authorId) {
    const sql = `
        INSERT INTO BlogPosts (title, blog_text, author_id)
        VALUES (?, ?, ?);
    `;
    const [result] = await connPool.execute(sql, [title, blogText, authorId]);
    return result.insertId;
}

/**
 * Retrieves a small number of recent posts for the homepage. 
 */
async function getRecentPosts(limit) {
    const limitInt = parseInt(limit) || 5;
    const sql = `
        SELECT p.id, p.title, p.date_posted, 
        p.blog_text, 
        SUBSTRING(p.blog_text, 1, 300) as preview_text, 
        u.username as author_name
        FROM BlogPosts p
        JOIN Users u ON p.author_id = u.id
        ORDER BY p.date_posted DESC
        LIMIT ?;
    `;
    // Ensure limit is passed as an integer for the LIMIT clause
    const [rows] = await connPool.query(sql, [limitInt]); 
    return rows;
}

/**
 * Retrieves a paginated list of all posts for browsing.
 */
async function getAllPosts(page, limit = 10) {
    const limitInt = parseInt(limit) || 10;
    const pageInt = parseInt(page) || 1;
    const offset = (pageInt - 1) * limitInt;
    const sql = `
        SELECT p.id, p.title, p.date_posted, 
        p.blog_text, 
        SUBSTRING(p.blog_text, 1, 300) as preview_text, 
        u.username as author_name
        FROM BlogPosts p
        JOIN Users u ON p.author_id = u.id
        ORDER BY p.date_posted DESC
        LIMIT ? OFFSET ?;
    `;
    // Pass limit and offset as integers
    const [rows] = await connPool.query(sql, [limitInt, offset]); 
    return rows;
}

/**
 * Retrieves a single, full blog post by ID.
 */
async function getPost(id) {
    const sql = `
        SELECT p.id, p.title, p.blog_text, p.date_posted, p.author_id, u.username as author_name
        FROM BlogPosts p
        JOIN Users u ON p.author_id = u.id
        WHERE p.id = ?;
    `;
    const [rows] = await connPool.execute(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Updates an existing blog post (Admin function).
 */
async function updatePost(id, title, blogText) {
    const sql = `
        UPDATE BlogPosts
        SET title = ?, blog_text = ?
        WHERE id = ?;
    `;
    const [result] = await connPool.execute(sql, [title, blogText, id]);
    return result.affectedRows > 0;
}

/**
 * Deletes a blog post 
 */
async function deletePost(id) {
    const sql = `
        DELETE FROM BlogPosts
        WHERE id = ?;
    `;
    const [result] = await connPool.execute(sql, [id]);
    return result.affectedRows > 0;
}

// Comments Functions

/**
 * Adds a new comment to a post. 
 */
async function addComment(postId, userId, content) {
    const sql = `
        INSERT INTO Comments (post_id, user_id, content)
        VALUES (?, ?, ?);
    `;
    const [result] = await connPool.execute(sql, [postId, userId, content]);
    return result.insertId;
}

/**
 * Retrieves all comments for a specific blog post.
 */
async function getCommentsForPost(postId) {
    const sql = `
        SELECT c.id, c.content, c.time_made, u.username as commenter_name, c.user_id
        FROM Comments c
        LEFT JOIN Users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.time_made ASC;
    `;
    const [rows] = await connPool.execute(sql, [postId]);
    return rows;
}

/**
 * Retrieves a single comment by ID (needed for permission checks).
 */
async function getComment(commentId) {
    const sql = `
        SELECT id, user_id 
        FROM Comments
        WHERE id = ?;
    `;
    const [rows] = await connPool.execute(sql, [commentId]);
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Deletes a specific comment (Admin or original author only).
 */
async function deleteComment(commentId) {
    const sql = `
        DELETE FROM Comments
        WHERE id = ?;
    `;
    const [result] = await connPool.execute(sql, [commentId]);
    return result.affectedRows > 0;
}

/**
 * Escalates a user to admin status.
 */
async function escalateToAdmin(userId) {
    const sql = `
        UPDATE Users
        SET is_admin = 1
        /* The AND is important to prevent redundant updates */
        WHERE id = ? AND is_admin = 0; 
    `;
    const [result] = await connPool.execute(sql, [userId]);
    return result.affectedRows > 0;
}

module.exports = {
    // Auth
    createUser,
    getUserByUsername,
    getUserById,
    escalateToAdmin,

    // Posts
    getTotalPostsCount,
    createPost,
    getRecentPosts,
    getAllPosts,
    getPost,
    updatePost,
    deletePost,

    // Comments
    addComment,
    getCommentsForPost,
    getComment,
    deleteComment,

    // Admin
    escalateToAdmin
};