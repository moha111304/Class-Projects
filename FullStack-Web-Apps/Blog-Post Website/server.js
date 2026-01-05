require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const data = require('./data');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 4131;

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

const rounds = 10;
// For extra credit
async function hashPassword(password) {
    return await bcrypt.hash(password, rounds);
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

//  --- Helper Middleware ---
function requireAdmin(req, res, next) {
    if (!req.isAdmin) {
        return res.status(403).render('404', { message: "Access Denied. Admin privileges required." });
    }
    next();
}

// Helper Middleware
async function setUserState(req, res, next) {
    req.user = null;
    req.isAdmin = false;
    
    const userId = req.cookies.session_id; 
    if (userId) {
        try {
            const user = await data.getUserById(userId); 
            if (user) {
                req.user = user;
                req.isAdmin = user.is_admin;
            }
        } catch (e) {
            console.error("Error setting user state:", e);
        }
    }

    next();
}

// Helper Middleware
async function requestLogger(req, res, next) {
    const start = process.hrtime();
    const originalEnd = res.end;
    let totalPosts = 0;

    // Fetch total posts count for the log
    try {
        totalPosts = await data.getTotalPostsCount();
    } catch (e) {
        // Silence logger errors to prevent crashing
    }

    res.end = function (...args) {
        
        console.log(`[${req.method}] ${req.originalUrl} [${res.statusCode || res.externalStatusCode}] (Posts: ${totalPosts})`);
        
        originalEnd.apply(res, args);
    };

    next();
}

app.use(setUserState);
app.use(requestLogger);

// Server Routes

// GET Routes

app.get(['/', '/about'], async (req, res) => {
    try {
        // Use getRecentPosts for the homepage listing requirement
        const recentPosts = await data.getRecentPosts(5); 
        res.render('about', { 
            recentPosts: recentPosts,
            isLoggedIn: !!req.user,
            isAdmin: req.isAdmin
        });
    } catch (error) {
        console.error("Error fetching homepage posts:", error);
        res.status(500).render('500', { message: 'Failed to load homepage.' });
    }
});

// GET /posts/:id - View single post
app.get('/posts/:id', async (req, res) => {
    const postId = req.params.id;
    try {
        const post = await data.getPost(postId);
        
        if (!post) {
            return res.status(404).render('404', { message: 'Blog post not found.' });
        }
        
        // Fetch comments for the post
        const comments = await data.getCommentsForPost(postId);

        res.render('post', { 
            post: post,
            comments: comments,
            isLoggedIn: !!req.user,
            isAdmin: req.isAdmin,
            user: req.user
        });

    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).render('500', { message: 'Server error while fetching post.' });
    }
});


// GET /posts - Browse posts list
app.get('/posts', async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const limit = 10; 

    try {
        const posts = await data.getAllPosts(page, limit);
        const totalPosts = await data.getTotalPostsCount();

        res.render('posts_list', {
            posts: posts,
            currentPage: page,
            limit: limit,
            isAdmin: req.isAdmin,
            isLoggedIn: !!req.user,
            totalPosts: totalPosts
        });
        
    } catch (error) {
        console.error("Error fetching posts list:", error);
        res.status(500).render('500', { message: 'Server error while fetching posts list.' });
    }
});


// AUTH Routes

app.get('/login', (req, res) => {
    let errorMessage = null;
    let successMessage = null;

    // Check for the promoted flag
    if (req.query.promoted === 'true') {
        successMessage = "Account successfully promoted to Admin! Please log in again.";
    } 
    
    // Check for error
    if (req.query.error) {
        errorMessage = req.query.error;
    }

    res.render('login', { 
        error: errorMessage, 
        success: successMessage 
    });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await data.getUserByUsername(username);

        // Password check (implement bcrypt for extra credit)
        if (user && await bcrypt.compare(password, user.password_hash)) { 
            // Successful Login: Set secure cookie/session
            const userIdString = String(user.id);
            const safeSessionId = sanitizeCookieValue(userIdString);
            res.cookie('session_id', safeSessionId, { httpOnly: true, maxAge: 900000 }); 
            res.redirect('/');
        } else {
            const errorMessage = escapeHtml('Invalid username or password.');
            res.render('login', { error: errorMessage });
        }
    } catch (error) {
        console.error("Login error:", error);
        const errorMessage = escapeHtml('An internal server error occurred.');
        res.status(500).render('login', { error: errorMessage });
    }
});

// GET /register - Renders the registration form
app.get('/register', (req, res) => {
    // Renders the new registration PUG file (which you still need to create)
    res.render('register', { error: null, username: null }); 
});


// POST /register - Handles the registration submission
app.post('/register', async (req, res) => {
    const { username, password, confirm_password } = req.body;
    let errorMessage = '';

    // Basic Validation
    if (!username || !password || !confirm_password) {
        errorMessage = escapeHtml('All fields are required.');
    } else if (password !== confirm_password) {
        errorMessage = escapeHtml('Passwords do not match.');
    } else if (password.length < 5) {
        errorMessage = escapeHtml('Password must be at least 5 characters long.');
    }

    if (errorMessage) {
        return res.render('register', { error: errorMessage, username: username });
    }

    try {
        // Check if user already exists
        const existingUser = await data.getUserByUsername(username);
        if (existingUser) {
            errorMessage = escapeHtml('Username already taken.');
            return res.render('register', { error: errorMessage, username: username });
        }
        
        // Hash password and create user 
        const passwordHash = await hashPassword(password); 
        const newUserId = await data.createUser(username, passwordHash, false); 
        
        // Automatically log the new user in
        const safeSessionId = sanitizeCookieValue(String(newUserId));
        res.cookie('session_id', safeSessionId, { httpOnly: true, maxAge: 900000 }); 

        res.redirect('/'); 

    } catch (error) {
        console.error("Registration error:", error);
        errorMessage = escapeHtml('An internal server error occurred during registration.');
        res.status(500).render('register', { error: errorMessage, username: username });
    }
});

app.get('/logout', (req, res) => {
    // Clear session cookie
    res.clearCookie('session_id');
    res.redirect('/');
});


// Admin GET Routes

// Apply Admin Protection to all /admin paths
app.use('/admin', requireAdmin);

// GET /admin/posts - Admin list
app.get('/admin/posts', async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const limit = 10; 

    try {
        const posts = await data.getAllPosts(page, limit);
        const totalPosts = await data.getTotalPostsCount();
        res.render('posts_list', {
            posts: posts,
            currentPage: page,
            limit: limit,
            isAdmin: true,
            isLoggedIn: !!req.user, 
            totalPosts: totalPosts
        });
    } catch (error) {
        console.error("Error fetching admin posts list:", error);
        res.status(500).render('500', { message: 'Server error.' });
    }
});

// GET /admin/create - Form to create a new post
app.get('/admin/create', (req, res) => {
    res.render('post_form', { isEdit: false, post: null, isLoggedIn: !!req.user });
});

// GET /admin/edit/:id - Form to edit an existing post 
app.get('/admin/edit/:id', async (req, res) => {
    try {
        const post = await data.getPost(req.params.id);
        if (!post) {
            return res.status(404).render('404', { message: "Post not found for editing." });
        }
        res.render('post_form', { isEdit: true, post: post, isLoggedIn: !!req.user });
    } catch (error) {
        console.error("Error fetching post for editing:", error);
        res.status(500).render('500', { message: 'Server error.' });
    }
});


// API Routes (POST, PUT, DELETE)

// POST /api/posts - Create new post
app.post('/api/posts', requireAdmin, async (req, res) => {
    const { title, blog_text } = req.body;
    
    if (!title || !blog_text) {
        return res.status(400).json({ status: 'error', errors: [escapeHtml('Title and content are required.')] });
    }

    try {
        const authorId = req.user.id; 
        const newPostId = await data.createPost(title, blog_text, authorId);
        
        res.status(201).json({ status: 'success', id: newPostId });
    } catch (error) {
        console.error("API Error creating post:", error);
        res.status(500).json({ status: 'error', errors: ['Failed to create post due to a server error.'] });
    }
});

// PUT /api/posts/:id - Edit existing post
app.put('/api/posts/:id', requireAdmin, async (req, res) => {
    const postId = req.params.id;
    const { title, blog_text } = req.body;

    if (!title || !blog_text) {
        return res.status(400).json({ status: 'error', errors: [escapeHtml('Title and content are required.')] });
    }

    try {
        const success = await data.updatePost(postId, title, blog_text);
        
        if (success) {
            res.status(200).json({ status: 'success', id: postId });
        } else {
            res.status(404).json({ status: 'error', errors: ['Post not found or no changes made.'] });
        }
    } catch (error) {
        console.error("API Error updating post:", error);
        res.status(500).json({ status: 'error', errors: [escapeHtml('Failed to update post due to a server error.')] });
    }
});

// DELETE /api/posts/:id - Delete post
app.delete('/api/posts/:id', requireAdmin, async (req, res) => {
    try {
        const success = await data.deletePost(req.params.id);
        
        if (success) {
            res.status(204).end(); 
        } else {
            res.status(404).end();
        }
    } catch (error) {
        console.error("API Error deleting post:", error);
        res.status(500).json({ status: 'error', errors: ['Failed to delete post.'] });
    }
});

// POST /api/comments - Add new comment
app.post('/api/comments', async (req, res) => {
    const { postId, content, guest_name } = req.body;
    let userId = req.user ? req.user.id : null; 

    if (!content || !postId) {
        return res.status(400).json({ status: 'error', errors: [escapeHtml('Comment content and post ID are required.')] });
    }
    
    try {
        const commentId = await data.addComment(postId, userId, content);
        
        // Fetch the new comment back for DOM update
        const comments = await data.getCommentsForPost(postId);
        const newComment = comments.find(c => c.id == commentId);
        
        res.status(201).json({ 
            status: 'success', 
            comment: newComment
        });
    } catch (error) {
        console.error("API Error adding comment:", error);
        res.status(500).json({ status: 'error', errors: ['Failed to add comment.'] });
    }
});

// DELETE /api/comments/:id - Delete comment
app.delete('/api/comments/:id', async (req, res) => {
    const commentId = req.params.id;
    
    // Check permissions
    try {
        const comment = await data.getComment(commentId); 
        
        if (!comment) return res.status(404).end(); 
        
        // Check if user is admin OR the comment author
        const isAuthorized = req.isAdmin || (req.user && comment.user_id === req.user.id);
        
        if (!isAuthorized) {
            return res.status(403).end();
        }

        const success = await data.deleteComment(commentId);
        
        if (success) {
            res.status(204).end();
        } else {
            res.status(404).end();
        }
    } catch (error) {
        console.error("API Error deleting comment:", error);
        res.status(500).json({ status: 'error', errors: ['Failed to delete comment.'] });
    }
});

// Secret Admin Escalation Route
app.get(`/secret-admin-key/${process.env.ADMIN_SECRET_PATH}`, async (req, res) => {
    // Must be logged in to promote yourself
    if (!req.user) {
        return res.status(403).render('404', { message: "Access Denied. You must be logged in to use this feature." });
    }

    // Prevent already existing admins from using it
    if (req.isAdmin) {
        return res.redirect('/admin/posts');
    }

    try {
        const success = await data.escalateToAdmin(req.user.id);

        if (success) {
            // Clear the cookie and redirect to login
            res.clearCookie('session_id');
            return res.redirect('/login?promoted=true');
        } else {
            return res.status(500).render('500', { message: "Failed to update user status in the database." });
        }
    } catch (error) {
        console.error("Admin escalation error:", error);
        res.status(500).render('500', { message: 'Server error during escalation.' });
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