// --- Configuration ---
const API_BASE_URL = 'https://eduloop-backend.onrender.com/event'; 

// --- DOM Elements ---
const loadingSpinner = document.getElementById('loading-spinner');
const eventContainer = document.getElementById('event-detail-container');
const deleteBtn = document.getElementById('delete-event-btn');

// --- Mobile Menu Toggle (Reused for details page) ---
const menuIcon = document.querySelector('.my-menu-icon');
const navLinks = document.querySelector('.nav-links');
if(menuIcon && navLinks) {
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

function getAuthToken() {
    return localStorage.getItem('authToken'); 
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadUserAvatar();
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    const profileImage = document.querySelector('.nav-avatar');
    profileImage.src = localStorage.getItem("profilePic") || "../assets/profile.png"; 

    if (!eventId) {
        loadingSpinner.innerHTML = `
            <p style="color: red; font-weight: bold;">No Event ID found in the URL.</p>
            <a href="event.html" class="btn-secondary">Go back</a>
        `;
        return;
    }

    fetchSingleEvent(eventId);
});

// --- Fetch Data ---
async function fetchSingleEvent(eventId) {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/${eventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Server returned status ${response.status}`);
        }

        const eventData = await response.json();
        populateUI(eventData, eventId);

    } catch (error) {
        console.error("Fetch Error:", error);
        loadingSpinner.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation fa-3x" style="color: #dc2626;"></i>
            <p style="color: #dc2626; margin-top: 15px; font-weight: bold;">Connection Error: ${error.message}</p>
            <p style="font-size: 0.9rem; color: #555;">Make sure your backend server is running and you are logged in.</p>
            <br>
            <a href="event.html" style="color: #4f46e5; text-decoration: underline;">Return to Events</a>
        `;
    }
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

// --- Render Data ---
function populateUI(event, eventId) {
    loadingSpinner.style.display = 'none';
    eventContainer.style.display = 'block';

    document.getElementById('event-detail-title').textContent = event.title;
    document.getElementById('event-detail-organizer').textContent = event.organizedBy;
    document.getElementById('event-detail-location').textContent = event.location;
    document.getElementById('event-detail-time').textContent = event.time;
    document.getElementById('event-detail-description').textContent = event.description;
    
    const bannerImg = document.getElementById('event-detail-banner');
    bannerImg.src = event.bannerImage || '../assets/placeholder.jpg';
    bannerImg.alt = event.title;

    const categorySpan = document.getElementById('event-detail-category');
    categorySpan.textContent = (event.category || 'Event').toUpperCase();
    categorySpan.className = `category-label type-${event.category}`; 

    const eventDate = new Date(event.date);
    document.getElementById('event-detail-date').textContent = eventDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Check if the current user owns this post to show the delete button
    const token = getAuthToken();
    if (token && event.createdBy) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const creatorId = typeof event.createdBy === 'object' ? event.createdBy._id : event.createdBy;
            
            if (payload.userId === creatorId || payload.id === creatorId) {
                deleteBtn.style.display = 'flex';
                setupDelete(eventId);
            }
        } catch (e) {
            console.warn('Could not decode token for authorization check', e);
        }
    }
}

function setupDelete(eventId) {
    deleteBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (response.ok) {
                alert('Event deleted successfully.');
                window.location.href = 'event.html'; 
            } else {
                const result = await response.json();
                alert(result.message || 'Error deleting event.');
            }
        } catch (error) {
            alert('Failed to connect to the server.');
        }
    });
}