document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('post-form');
    const formErrors = document.getElementById('form-errors');
    const prefillBtn = document.getElementById('prefill-btn');
    
    // --- Utility Functions ---

    // Function to display messages in the error box
    function displayErrors(messages) {
        formErrors.innerHTML = '';
        if (messages.length > 0) {
            formErrors.style.display = 'block';
            const ul = document.createElement('ul');
            messages.forEach(msg => {
                const li = document.createElement('li');
                li.textContent = msg;
                ul.appendChild(li);
            });
            formErrors.appendChild(ul);
        } else {
            formErrors.style.display = 'none';
        }
    }

    // --- Form Submission Handler ---
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const httpMethod = postForm.dataset.method; // POST or PUT
            const postId = postForm.dataset.postId;
            const formAction = httpMethod === 'PUT' ? `/api/posts/${postId}` : '/api/posts';

            // Gather data from the form
            const formData = {
                title: document.getElementById('title').value.trim(),
                blog_text: document.getElementById('blog_text').value.trim()
            };

            // Basic validation
            if (!formData.title || !formData.blog_text) {
                return displayErrors(['Please fill out both the title and content fields.']);
            }
            
            try {
                const response = await fetch(formAction, {
                    method: httpMethod,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    alert(`${httpMethod === 'PUT' ? 'Updated' : 'Created'} Post Successfully!`);
                    
                    // Redirect to the Admin list or the new post detail page
                    window.location.href = '/admin/posts'; 
                } else {
                    // Handle API validation errors or general server errors
                    displayErrors(result.errors || ['An unknown error occurred during post submission.']);
                }
            } catch (error) {
                console.error('Fetch Error:', error);
                displayErrors(['Failed to communicate with the server. Please check the console.']);
            }
        });
    }

    // --- Prefill Button Handler ---
    if (prefillBtn) {
        prefillBtn.addEventListener('click', () => {
            document.getElementById('title').value = "Test Blog Post Title ";
            document.getElementById('blog_text').value = `This is the test content for the blog post.
            Just a bunch of random nonsense. My favorite show is Psych (2006).

            Author: TestUser
            Date: ${new Date().toLocaleString()}`;
        });
    }
});