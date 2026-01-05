document.addEventListener('DOMContentLoaded', () => {
    const commentsList = document.getElementById('comments-list');
    const commentForm = document.getElementById('comment-form');
    const deletePostBtn = document.getElementById('delete-post-btn');

    // Utility Functions

    // Function to handle showing/hiding error messages
    function showLocalError(form, message) {
        let errorBox = form.querySelector('.local-error');
        if (!errorBox) {
            errorBox = document.createElement('p');
            errorBox.className = 'local-error';
            errorBox.style.color = 'red';
            errorBox.style.marginTop = '10px';
            form.prepend(errorBox);
        }
        errorBox.textContent = message;
        errorBox.style.display = 'block';
    }
    
    // Function to create and append a new comment element to the DOM
    function renderNewComment(comment) {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.dataset.commentId = comment.id;
        
        commentItem.innerHTML = `
            <div class="comment-header">
                <strong>${comment.commenter_name || 'Guest'}</strong> 
                <span class="comment-date">${new Date(comment.time_made).toLocaleString()}</span>
            </div>
            <p class="comment-content">${comment.content}</p>
            `;

        commentsList.prepend(commentItem); // Add new comment to the top
    }

    // Comment Submission Handler
    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const postId = commentForm.dataset.postId;
            const content = document.getElementById('comment-content').value.trim();
            const guestNameInput = document.getElementById('guest_name');

            if (!content) {
                return showLocalError(commentForm, 'Comment content cannot be empty.');
            }

            const formData = {
                postId: postId,
                content: content,
                // Only include guest_name if the field exists (like the user is logged out)
                guest_name: guestNameInput ? guestNameInput.value.trim() : null
            };

            try {
                const response = await fetch('/api/comments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    renderNewComment(result.comment);
                    
                    // Clear the form fields
                    document.getElementById('comment-content').value = '';
                    if (guestNameInput) guestNameInput.value = '';
                    
                    // Hide any previous error message
                    showLocalError(commentForm, '');
                } else {
                    showLocalError(commentForm, result.errors ? result.errors[0] : 'Failed to post comment.');
                }
            } catch (error) {
                console.error('Comment Submission Error:', error);
                showLocalError(commentForm, 'Failed to connect to the server.');
            }
        });
    }

    // Post Deletion Handler
    if (deletePostBtn) {
        deletePostBtn.addEventListener('click', async () => {
            const postId = deletePostBtn.dataset.postId;
            if (!confirm("Are you sure you want to permanently delete this blog post?")) {
                return;
            }

            try {
                const response = await fetch(`/api/posts/${postId}`, {
                    method: 'DELETE',
                });

                if (response.status === 204) {
                    alert('Post deleted successfully.');
                    // Redirect to the admin list after successful deletion
                    window.location.href = '/admin/posts'; 
                } else {
                    alert('Failed to delete post. Check permissions or server log.');
                }
            } catch (error) {
                console.error('Post Deletion Error:', error);
                alert('An error occurred while attempting to delete the post.');
            }
        });
    }

    // Comment Deletion Handler
    if (commentsList) {
        commentsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-comment-btn')) {
                const commentId = e.target.dataset.commentId;
                const commentItem = e.target.closest('.comment-item');

                if (!confirm("Are you sure you want to delete this comment?")) {
                    return;
                }

                try {
                    const response = await fetch(`/api/comments/${commentId}`, {
                        method: 'DELETE',
                    });

                    if (response.status === 204) {
                        // Remove the comment from the DOM
                        commentItem.remove(); 
                    } else if (response.status === 403) {
                        alert('Permission denied. You must be the author or an administrator to delete this comment.');
                    } else {
                        alert('Failed to delete comment. Comment may not exist.');
                    }
                } catch (error) {
                    console.error('Comment Deletion Error:', error);
                    alert('An error occurred while attempting to delete the comment.');
                }
            }
        });
    }

    // Post List Deletion Handler 
    // For buttons in posts_list.pug with class .mini-delete
    
    const postsContainer = document.querySelector('.posts-list-container');

    if (postsContainer) {
        postsContainer.addEventListener('click', async (e) => {
            // Check if the thing clicked has the class 'mini-delete'
            if (e.target.classList.contains('mini-delete')) {
                const btn = e.target;
                const postId = btn.dataset.postId;

                if (!confirm("Are you sure you want to permanently delete this blog post?")) {
                    return;
                }

                try {
                    const response = await fetch(`/api/posts/${postId}`, {
                        method: 'DELETE',
                    });

                    if (response.status === 204) {
                        alert('Post deleted successfully.');
                        // Remove the row from the screen immediately so you don't have to refresh
                        const postElement = btn.closest('.post-preview');
                        if (postElement) {
                            postElement.remove();
                        }
                    } else {
                        alert('Failed to delete post. Check permissions.');
                    }
                } catch (error) {
                    console.error('List Deletion Error:', error);
                    alert('An error occurred.');
                }
            }
        });
    }
});