// --- Configuration ---
// Make sure this matches your app.js route (e.g., app.use('/feed', feedRouter))
const API_BASE_URL = 'https://eduloop-backend.onrender.com/feed';

// --- DOM Elements ---
const createPostForm = document.getElementById('createPostForm');
const postStream = document.querySelector('.post-stream');
const filterButtons = document.querySelectorAll('.filter-pill');
const imageUploadInput = document.getElementById('imageUpload');
const uploadLabel = document.querySelector('.upload-btn');
const menuIcon = document.querySelector('.my-menu-icon');
const navLinks = document.querySelector('.nav-links');

// --- Global State ---
let allPosts = [];
let currentFilter = 'all';
let currentUserId = getUserIdFromToken();

// --- Mobile Menu Toggle ---
if (menuIcon && navLinks) {
    menuIcon.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        if (navLinks.classList.contains('active')) {
            menuIcon.classList.remove('fa-bars');
            menuIcon.classList.add('fa-xmark');
        } else {
            menuIcon.classList.remove('fa-xmark');
            menuIcon.classList.add('fa-bars');
        }
    });
}

// --- Utilities ---
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Decode the JWT to know who is logged in (so we only show delete buttons to the author)
function getUserIdFromToken() {
    const token = getAuthToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id || payload._id; 
    } catch (e) {
        return null;
    }
}

// Helper to format dates like "2 hours ago"
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    setupEventListeners();
});

// --- Fetch & Render Posts ---
async function fetchPosts() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/getAll`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load feed');

        allPosts = await response.json();
        renderPosts();
    } catch (error) {
        console.error('Fetch error:', error);
        postStream.innerHTML = `<p style="text-align:center; color:red;">Error connecting to server: ${error.message}</p>`;
    }
}

function renderPosts() {
    postStream.innerHTML = ''; // Clear current feed

    // Apply Filter
    const filteredPosts = allPosts.filter(post => {
        return currentFilter === 'all' || post.category === currentFilter;
    });

    if (filteredPosts.length === 0) {
        postStream.innerHTML = '<p style="text-align:center; padding: 40px; color: #666;">No posts to show here.</p>';
        return;
    }

    filteredPosts.forEach(post => {
        // Check permissions
        const isAuthor = currentUserId === (post.postedBy?._id || post.postedBy);
        const hasLiked = post.likes.includes(currentUserId);
        
        // Extract data safely
        const authorName = post.postedBy?.fullName || 'Unknown User';
        const authorImage = post.postedBy?.profilePic || '../assets/profile.png';
        const displayCategory = post.category.toUpperCase();
        
        // Build Comments HTML dynamically
        let commentsHTML = '';
        post.comments.forEach(comment => {
            const isCommentAuthor = currentUserId === (comment.user?._id || comment.user);
            const commentAuthorName = comment.user?.fullName || 'User';
            
            commentsHTML += `
                <div class="comment-item" data-comment-id="${comment._id}">
                  <span class="comment-author">${commentAuthorName}:</span>
                  <span class="comment-text">${comment.text}</span>
                  ${isCommentAuthor ? `<i class="fa-solid fa-trash delete-comment-btn" title="Delete comment" style="cursor:pointer; color:#ef4444; margin-left:10px; font-size:0.8rem;"></i>` : ''}
                </div>
            `;
        });

        // Build the full Post HTML
        const postHTML = `
            <article class="post-card" data-post-id="${post._id}">
              <div class="post-category-stripe stripe-${post.category}"></div>
              
              <div class="post-inner">
                <header class="post-header">
                  <div class="author-info">
                    <img src="${authorImage}" alt="${authorName}" class="nav-avatar" />
                    <div class="author-meta">
                      <span class="author-name">${authorName}</span>
                      <span class="post-timestamp">${timeAgo(post.createdAt)}</span>
                    </div>
                  </div>
                  <span class="badge badge-${post.category}">${displayCategory}</span>
                </header>

                <div class="post-body">
                  <p>${post.content}</p>
                  ${post.image ? `<img src="${post.image}" alt="Attached image" class="post-attached-image" />` : ''}
                </div>

                <footer class="post-interactions">
                  <button class="action-btn like-btn ${hasLiked ? 'liked' : ''}" style="${hasLiked ? 'color: #ef4444;' : ''}">
                    <i class="${hasLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    <span class="like-count">${post.likes.length}</span>
                  </button>

                  <button class="action-btn comment-toggle-btn">
                    <i class="fa-regular fa-comment"></i>
                    <span class="comment-count">${post.comments.length}</span>
                  </button>

                  ${isAuthor ? `
                  <button class="action-btn delete-btn" style="color: #ef4444;" title="Delete Post">
                    <i class="fa-regular fa-trash-can"></i>
                  </button>` : ''}
                </footer>

                <div class="comments-section" style="display: none;">
                  <form class="add-comment-form">
                    <input type="text" name="commentText" placeholder="Write a comment..." required />
                    <button type="submit">
                      <i class="fa-solid fa-paper-plane"></i>
                    </button>
                  </form>
                  <div class="comments-list">
                    ${commentsHTML}
                  </div>
                </div>
              </div>
            </article>
        `;
        postStream.insertAdjacentHTML('beforeend', postHTML);
    });
}

// --- Event Listeners ---
function setupEventListeners() {
    
    // 1. Create Post Submission
    if (createPostForm) {
        createPostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('post-btn');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Posting...';
            submitBtn.disabled = true;

            const formData = new FormData(createPostForm);

            try {
                const response = await fetch(`${API_BASE_URL}/createPost`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                    body: formData // Browser handles multipart boundaries
                });

                if (response.ok) {
                    createPostForm.reset();
                    uploadLabel.innerHTML = '<i class="fa-solid fa-image"></i> Add Image';
                    fetchPosts(); // Refresh feed to show new post
                } else {
                    const err = await response.json();
                    alert(err.message || 'Error creating post');
                }
            } catch (error) {
                alert('Connection error while posting.');
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // 2. Image Upload UI update
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                uploadLabel.innerHTML = `<i class="fa-solid fa-check"></i> ${this.files[0].name}`;
            }
        });
    }

    // 3. Category Filters
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Manage active class state
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update filter and re-render the DOM
            currentFilter = e.target.getAttribute('data-filter');
            renderPosts();
        });
    });

    // 4. Feed Interactions (Likes, Comments, Deletes via Event Delegation)
    if (postStream) {
        
        // Handle Clicks
        postStream.addEventListener('click', async (e) => {
            const card = e.target.closest('.post-card');
            if (!card) return;
            const postId = card.getAttribute('data-post-id');

            // --- Toggle Comments View ---
            if (e.target.closest('.comment-toggle-btn')) {
                const commentsSection = card.querySelector('.comments-section');
                commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
                return;
            }

            // --- Like / Unlike Post ---
            if (e.target.closest('.like-btn')) {
                try {
                    const response = await fetch(`${API_BASE_URL}/like/${postId}`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                    });
                    if (response.ok) fetchPosts(); 
                } catch (error) {
                    console.error('Like error:', error);
                }
                return;
            }

            // --- Delete Post ---
            if (e.target.closest('.delete-btn')) {
                if (!confirm('Are you sure you want to delete this post?')) return;
                try {
                    const response = await fetch(`${API_BASE_URL}/${postId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                    });
                    if (response.ok) fetchPosts(); // Re-fetch to update the feed
                } catch (error) {
                    console.error('Delete post error:', error);
                }
                return;
            }

            // --- Delete Comment ---
            if (e.target.closest('.delete-comment-btn')) {
                if (!confirm('Delete this comment?')) return;
                const commentId = e.target.closest('.comment-item').getAttribute('data-comment-id');
                try {
                    const response = await fetch(`${API_BASE_URL}/comment/${postId}/${commentId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                    });
                    if (response.ok) fetchPosts(); 
                } catch (error) {
                    console.error('Delete comment error:', error);
                }
            }
        });

        // Handle Submits (Adding a new comment)
        postStream.addEventListener('submit', async (e) => {
            if (e.target.matches('.add-comment-form')) {
                e.preventDefault();
                
                const card = e.target.closest('.post-card');
                const postId = card.getAttribute('data-post-id');
                const input = e.target.querySelector('input[name="commentText"]');
                const text = input.value.trim();

                if (!text) return;

                const submitBtn = e.target.querySelector('button');
                submitBtn.disabled = true;

                try {
                    const response = await fetch(`${API_BASE_URL}/comment/${postId}`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${getAuthToken()}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ text })
                    });

                    if (response.ok) {
                        fetchPosts(); // Re-fetch to show new comment instantly
                    } else {
                        alert('Failed to post comment.');
                    }
                } catch (error) {
                    console.error('Comment error:', error);
                } finally {
                    submitBtn.disabled = false;
                }
            }
        });
    }
}