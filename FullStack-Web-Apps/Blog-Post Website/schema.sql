CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT 0,
    time_madeDATETIME NOT NULL DEFAULT NOW() 
);

CREATE TABLE BlogPosts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    blog_text TEXT NOT NULL,
    date_posted DATETIME NOT NULL DEFAULT NOW(),
    author_id INT NOT NULL,
    FOREIGN KEY (author_id) REFERENCES Users(id)
        ON DELETE CASCADE
);

CREATE TABLE Comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT,
    content TEXT NOT NULL,
    time_made DATETIME NOT NULL DEFAULT NOW(),
    FOREIGN KEY (post_id) REFERENCES BlogPosts(id)
        ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
        ON DELETE SET NULL 
);