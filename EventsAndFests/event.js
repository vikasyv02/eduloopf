// --- Configuration ---
const API_BASE_URL = 'https://eduloop-backend.onrender.com/event'; 

// --- DOM Elements ---
const menuIcon = document.querySelector('.my-menu-icon');
const navLinks = document.querySelector('.nav-links');
const form = document.getElementById('eventCreationForm');
const galleryContainer = document.querySelector('.events-gallery');
const filterTabs = document.querySelectorAll('.filter-tab');
const fileInput = document.getElementById('eventBannerInput');
const fileLabel = document.querySelector('.file-upload-label');
const newEventDetails = document.querySelector('.new-event-container');

// --- Global State ---
let allEvents = [];
let currentFilter = 'all';

// --- Utility: Get Auth Token ---
function getAuthToken() {
    return localStorage.getItem('authToken'); 
}

// --- Mobile Menu Toggle ---
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

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadUserAvatar();
    fetchEvents();
    setupEventListeners();
});

// --- Fetch & Render Events ---
async function fetchEvents() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/getAllEvent`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch events from server.');

        allEvents = await response.json();
        const profileImage = document.querySelector('.nav-avatar');
        profileImage.src = localStorage.getItem("profilePic") || "../assets/profile.png"; 
        renderEvents();
    } catch (error) {
        console.error(error);
        galleryContainer.innerHTML = `<p style="text-align:center; width: 100%; color: red;">Error: ${error.message}</p>`;
    }
}

function renderEvents() {
    galleryContainer.innerHTML = ''; 

    const filteredEvents = allEvents.filter(event => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'tech' && event.category === 'hackathon') return true;
        return event.category === currentFilter;
    });

    if (filteredEvents.length === 0) {
        galleryContainer.innerHTML = '<p style="text-align:center; width: 100%;">No events found for this category.</p>';
        return;
    }

    filteredEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
        const day = eventDate.getDate();
        const timeString = event.time || 'TBA';
        const displayCategory = (event.category || 'Event').toUpperCase();

        const articleHTML = `
            <article class="event-item" data-event-id="${event._id}">
              <div class="event-thumbnail-wrapper">
                <img src="${event.bannerImage || '../assets/placeholder.jpg'}" alt="${event.title}" class="event-thumbnail-img" />
                <div class="event-calendar-badge">
                  <span class="month">${month}</span>
                  <span class="day">${day}</span>
                </div>
                <span class="category-label type-${event.category}">${displayCategory}</span>
              </div>

              <div class="event-details">
                <h2 class="event-heading">${event.title}</h2>
                <p class="event-host">By ${event.organizedBy}</p>

                <div class="event-meta-info">
                  <span class="meta-item"><i class="fa-regular fa-clock"></i> ${timeString}</span>
                  <span class="meta-item"><i class="fa-solid fa-location-dot"></i> ${event.location}</span>
                </div>

                <p class="event-summary">${event.description}</p>
              </div>

              <div class="event-actions-bar">
                <button class="btn-secondary view-details-btn">View Details</button>
                <button class="btn-icon-danger delete-event-btn" title="Delete Event">
                  <i class="fa-regular fa-trash-can"></i>
                </button>
              </div>
            </article>
        `;
        galleryContainer.insertAdjacentHTML('beforeend', articleHTML);
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
    // Submit New Event
    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Publishing...';
            submitBtn.disabled = true;

            const formData = new FormData(form);

            try {
                const response = await fetch(`${API_BASE_URL}/createEvent`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                    body: formData 
                });

                const result = await response.json();
                if (response.ok) {
                    alert(result.message || 'Event created!');
                    form.reset();
                    fileLabel.innerHTML = '<i class="fa-solid fa-image"></i> Upload Banner Image';
                    newEventDetails.removeAttribute('open'); 
                    fetchEvents(); 
                } else {
                    alert('Error: ' + (result.error || result.message));
                }
            } catch (error) {
                alert('Failed to create event. Is the server running?');
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // File Input UI Change
    if(fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                fileLabel.innerHTML = `<i class="fa-solid fa-check"></i> ${this.files[0].name}`;
            }
        });
    }

    // Filter Tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            filterTabs.forEach(t => t.classList.remove('is-active'));
            e.target.classList.add('is-active');
            currentFilter = e.target.getAttribute('data-category');
            renderEvents();
        });
    });

    // Delegation for View Details & Delete
    galleryContainer.addEventListener('click', async (e) => {
        const card = e.target.closest('.event-item');
        if (!card) return;
        const eventId = card.getAttribute('data-event-id');

        // View Details Route
        if (e.target.closest('.view-details-btn')) {
            window.location.href = `event-details.html?id=${eventId}`;
            return;
        }

        // Delete Route
        const deleteBtn = e.target.closest('.delete-event-btn');
        if (deleteBtn) {
            if (!confirm('Are you sure you want to delete this event?')) return;
            try {
                const response = await fetch(`${API_BASE_URL}/${eventId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
                });
                if (response.ok) {
                    allEvents = allEvents.filter(ev => ev._id !== eventId);
                    renderEvents();
                } else {
                    const result = await response.json();
                    alert(result.message || 'Error deleting event. (Are you the creator?)');
                }
            } catch (error) {
                alert('Failed to connect to server.');
            }
        }
    });
}