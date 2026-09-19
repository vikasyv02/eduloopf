// 1. Grab the elements from your HTML
const menuIcon = document.querySelector('.my-menu-icon');
const navLinks = document.querySelector('.nav-links');
// 2. Listen for a click on the hamburger icon
menuIcon.addEventListener('click', function() {
  
  // 3. Toggle the 'active' class on and off
  navLinks.classList.toggle('active');
  
  // Optional: Change the icon from a hamburger (bars) to an 'X' (xmark) when open
  if (navLinks.classList.contains('active')) {
    menuIcon.classList.remove('fa-bars');
    menuIcon.classList.add('fa-xmark');
  } else {
    menuIcon.classList.remove('fa-xmark');
    menuIcon.classList.add('fa-bars');
  }
});



// --- Configuration ---
// Base URL matches the app.use("/lostAndFound", lostAndFoundRouter) in app.js
const API_BASE_URL = 'https://eduloop-backend.onrender.com/lostAndFound'; 

// --- DOM Elements ---
const form = document.getElementById('lostFoundForm');
const listContainer = document.querySelector('.lost-found-list');
const searchInput = document.querySelector('.search-input-wrapper input');
const filterTabs = document.querySelectorAll('.filter-tab');
const imageInput = document.getElementById('itemImageInput');
const fileUploadLabel = document.querySelector('.file-upload-label');

// --- Global State ---
let allPosts = [];
let currentFilter = 'All'; // 'All', 'Lost', 'Found'

// --- Utility: Get Auth Token ---
function getAuthToken() {
    return localStorage.getItem('authToken'); 
}

function getUserIdFromToken() {
    const token = getAuthToken();
    if (!token) return null;
    try {
        // Decodes the payload section of the JWT
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id || payload._id; 
    } catch (e) {
        return null;
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadUserAvatar();
    fetchPosts();
    setupEventListeners();
});

// --- Fetch & Render Posts ---
async function fetchPosts() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/getAllPost`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch posts');

        allPosts = await response.json(); 
        renderPosts();
    } catch (error) {
        console.error('Error fetching posts:', error);
        listContainer.innerHTML = '<p style="text-align:center;">Failed to load items. Please ensure you are logged in and the server is running.</p>';
    }
}

function renderPosts() {
    listContainer.innerHTML = ''; 
    
    // 1. Define currentUserId at the top so it's available for the loop
    const currentUserId = getUserIdFromToken(); 
    const searchTerm = searchInput.value.toLowerCase();

    const filteredPosts = allPosts.filter(post => {
        const postStatus = post.status || 'lost'; 
        const matchesFilter = currentFilter === 'All' || postStatus.toLowerCase() === currentFilter.toLowerCase();
        const matchesSearch = post.title.toLowerCase().includes(searchTerm) || 
                              post.description.toLowerCase().includes(searchTerm);
        return matchesFilter && matchesSearch;
    });

    if (filteredPosts.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center;">No items found matching your criteria.</p>';
        return;
    }

    filteredPosts.forEach(post => {
        const statusClass = post.status === 'found' ? 'badge-found' : 'badge-lost';
        const displayStatus = (post.status || 'lost').toUpperCase();
        
        const datePosted = new Date(post.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });

        const reporterName = post.postedBy?.fullName || 'Anonymous User';
        const reporterImage = post.postedBy?.profilePic || '../assets/profile.png';

        // 2. Now isAuthor will correctly compare the IDs
        const isAuthor = currentUserId === (post.postedBy?._id || post.postedBy);

        const cardHTML = `
            <div class="lost-found-card" data-id="${post._id}">
              <div class="card-image-wrapper">
                <span class="status badge ${statusClass}">${displayStatus}</span>
                <img src="${post.imageUrl}" alt="${post.title}" class="item-image" />
              </div>

              <div class="item-info">
                <h3 class="item-title">${post.title}</h3>
                <p class="item-meta">
                  <i class="fa-solid fa-location-dot"></i> ${post.location}
                </p>
                <p class="item-description">${post.description}</p>
                
                <div class="card-footer">
                  <div class="reporter-info">
                    <img src="${reporterImage}" alt="Profile" class="micro-avatar" />
                    <span class="reporter">${reporterName}</span>
                  </div>
                  <div class="report-date">${datePosted}</div>
                </div>

                <div class="card-actions">
                  <button class="btn-secondary contact-btn" onclick="alert('Contact Info: ${post.contactInfo}')">
                    <i class="fa-solid fa-address-book"></i> Contact
                  </button>
                  
                  ${isAuthor ? `
                  <button class="btn-icon-danger delete-btn">
                    <i class="fa-solid fa-trash"></i>
                  </button>` : ''}
                </div>
              </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function loadUserAvatar() {
    // 1. Get the image from LocalStorage
    const userImageUrl = localStorage.getItem('profilePic');
    
    // 2. If an image exists, find all default avatars on the page and swap them!
    if (userImageUrl) {
        const avatars = document.querySelectorAll('.nav-avatar');
        avatars.forEach(img => {
            // Only update images that are currently the default profile.png
            if (img.src.includes('profile.png')) {
                img.src = userImageUrl;
            }
        });
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // 1. Handle Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Submitting...';
        submitBtn.disabled = true;

        const formData = new FormData(form);

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/create`, {
                method: 'POST',
                // DO NOT set Content-Type header when using FormData with files.
                // The browser calculates the multipart boundaries automatically.
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || 'Post created successfully!');
                form.reset();
                fileUploadLabel.innerHTML = '<i class="fa-solid fa-image"></i> Upload Item Image';
                document.querySelector('.new-resource-container').removeAttribute('open'); // Close dropdown
                fetchPosts(); // Refresh the list
            } else {
                alert('Error: ' + (result.error || result.message));
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit post.');
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    // 2. Handle File Input Change (Update Label)
    imageInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            fileUploadLabel.innerHTML = `<i class="fa-solid fa-check"></i> ${this.files[0].name}`;
        }
    });

    // 3. Handle Search
    searchInput.addEventListener('input', () => {
        renderPosts();
    });

    // 4. Handle Filtering
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            filterTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilter = e.target.innerText;
            renderPosts();
        });
    });

    // 5. Handle Delete (Event Delegation)
    listContainer.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;

        if (!confirm('Are you sure you want to delete this post?')) return;

        const card = deleteBtn.closest('.lost-found-card');
        const postId = card.getAttribute('data-id');

        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                allPosts = allPosts.filter(p => p._id !== postId);
                renderPosts();
            } else {
                alert(result.message || 'Error deleting post.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete post.');
        }
    });
}