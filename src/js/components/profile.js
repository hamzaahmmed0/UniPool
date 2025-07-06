import { auth, db } from '../firebase-config.js';
import { getUserRides, getUserBookings, completeRide, cancelBooking } from '../services/ride-service.js';
import { submitRating, getUserRatings, canUserRate, getMutualRatingOpportunity } from '../services/rating-service.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Load user profile data
async function loadProfile() {
  try {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }

    // Show loading state
    showLoadingState();

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data();
    
    // Update profile display
    document.getElementById('user-name').textContent = userData.name || 'Unknown User';
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-role').textContent = userData.role || 'Student';
    document.getElementById('rides-completed').textContent = userData.ridesCompleted || 0;
    
    // Load rating display
    await loadRatingDisplay(user.uid);
    
    // Load rides and bookings
    await loadUserRides(user.uid);
    await loadUserBookings(user.uid);
    
    // Hide loading state
    hideLoadingState();
    
  } catch (error) {
    console.error('Error loading profile:', error);
    hideLoadingState();
    showMessage('Error loading profile: ' + error.message, 'error');
  }
}

// Load rating display
async function loadRatingDisplay(userId) {
  try {
    const ratings = await getUserRatings(userId);
    const averageRating = ratings.length > 0 
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 'No ratings yet';
    
    const ratingDisplay = document.getElementById('user-rating');
    if (ratingDisplay) {
      ratingDisplay.innerHTML = `
        <div class="rating-display">
          <span class="rating-stars">
            ${generateStars(averageRating)}
          </span>
          <span class="rating-text">${averageRating} (${ratings.length} ratings)</span>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading rating display:', error);
  }
}

// Generate star display
function generateStars(rating) {
  const numRating = parseFloat(rating);
  if (isNaN(numRating)) return '☆☆☆☆☆';
  
  const fullStars = Math.floor(numRating);
  const hasHalfStar = numRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
}

// Load user's posted rides
async function loadUserRides(userId) {
  try {
    const rides = await getUserRides(userId);
    const ridesContainer = document.getElementById('user-rides');
    
    if (rides.length === 0) {
      ridesContainer.innerHTML = '<div class="empty-state">No rides posted yet</div>';
      return;
    }
    
    ridesContainer.innerHTML = rides.map(ride => `
      <div class="ride-card">
        <div class="ride-header">
          <span class="ride-route">${ride.pickupArea || 'Campus'} &rarr; ${ride.destination || 'Downtown'}</span>
          <span class="ride-status ${ride.status}">${ride.status}</span>
        </div>
        <div class="ride-details">
          <span class="ride-detail"><strong>Date:</strong> ${ride.date || 'N/A'}</span>
          <span class="ride-detail"><strong>Time:</strong> ${ride.time || 'N/A'}</span>
          <span class="ride-detail"><strong>Seats:</strong> ${ride.seats || 'N/A'}</span>
        </div>
        <div class="ride-actions">
          ${ride.status === 'active' ? 
            `<button onclick="completeRide('${ride.id}')" class="btn btn-success">Complete Ride</button>` : 
            ''
          }
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading user rides:', error);
    document.getElementById('user-rides').innerHTML = '<div class="error-message">Error loading rides</div>';
  }
}

// Load user's booked rides
async function loadUserBookings(userId) {
  try {
    const bookings = await getUserBookings(userId);
    const bookingsContainer = document.getElementById('user-bookings');
    
    if (bookings.length === 0) {
      bookingsContainer.innerHTML = '<div class="empty-state">No bookings yet</div>';
      return;
    }
    
    bookingsContainer.innerHTML = bookings.map(booking => `
      <div class="ride-card">
        <div class="ride-header">
          <span class="ride-route">${booking.pickupArea || 'Campus'} &rarr; ${booking.destination || 'Downtown'}</span>
          <span class="ride-status ${booking.status}">${booking.status}</span>
        </div>
        <div class="ride-details">
          <span class="ride-detail"><strong>Driver:</strong> ${booking.driverName || 'N/A'}</span>
          <span class="ride-detail"><strong>Date:</strong> ${booking.date || 'N/A'}</span>
          <span class="ride-detail"><strong>Time:</strong> ${booking.time || 'N/A'}</span>
        </div>
        <div class="ride-actions">
          ${booking.status === 'active' ? 
            `<button onclick="cancelBooking('${booking.id}')" class="btn btn-danger">Cancel Booking</button>` : 
            ''
          }
          ${booking.status === 'completed' ? 
            `<button onclick="showRatingModal('${booking.id}')" class="btn btn-primary">Rate Ride</button>` : 
            ''
          }
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading user bookings:', error);
    document.getElementById('user-bookings').innerHTML = '<div class="error-message">Error loading bookings</div>';
  }
}

// Complete a ride
window.completeRide = async function(rideId) {
  try {
    if (!confirm('Mark this ride as completed?')) return;
    
    await completeRide(rideId);
    showMessage('Ride marked as completed!', 'success');
    
    // Reload profile data
    await loadProfile();
  } catch (error) {
    console.error('Error completing ride:', error);
    showMessage('Error completing ride: ' + error.message, 'error');
  }
};

// Cancel a booking
window.cancelBooking = async function(rideId) {
  try {
    if (!confirm('Cancel this booking?')) return;
    
    await cancelBooking(rideId, auth.currentUser.uid);
    showMessage('Booking cancelled!', 'success');
    
    // Reload profile data
    await loadProfile();
  } catch (error) {
    console.error('Error cancelling booking:', error);
    showMessage('Error cancelling booking: ' + error.message, 'error');
  }
};

// Show rating modal
window.showRatingModal = async function(rideId) {
  try {
    const opportunities = await getMutualRatingOpportunity(rideId, auth.currentUser.uid);
    
    if (opportunities.length === 0) {
      showMessage('No rating opportunities available for this ride', 'info');
      return;
    }
    
    // Create and show rating modal
    const modal = document.createElement('div');
    modal.className = 'rating-modal';
    modal.innerHTML = `
      <div class="rating-modal-content">
        <h3>Rate Your Ride Partners</h3>
        ${opportunities.map(opp => `
          <div class="rating-opportunity">
            <div class="rating-user-info">
              <span class="rating-user-name">${opp.name}</span>
              <span class="rating-user-role">${opp.role}</span>
            </div>
            <div class="rating-stars-input">
              ${[1,2,3,4,5].map(star => `
                <span class="star" data-star="${star}" data-user="${opp.userId}" onclick="selectStar(${star}, '${opp.userId}')">☆</span>
              `).join('')}
            </div>
            <textarea placeholder="Add a comment (optional)" class="rating-comment" data-user="${opp.userId}"></textarea>
          </div>
        `).join('')}
        <div class="rating-modal-actions">
          <button onclick="submitRatings()" class="btn btn-primary">Submit Ratings</button>
          <button onclick="closeRatingModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error showing rating modal:', error);
    showMessage('Error loading rating options: ' + error.message, 'error');
  }
};

// Select star rating
window.selectStar = function(rating, userId) {
  const stars = document.querySelectorAll(`[data-user="${userId}"]`);
  stars.forEach((star, index) => {
    if (index < rating) {
      star.textContent = '★';
      star.style.color = '#ffd700';
    } else {
      star.textContent = '☆';
      star.style.color = '#ccc';
    }
  });
};

// Submit ratings
window.submitRatings = async function() {
  try {
    const opportunities = document.querySelectorAll('.rating-opportunity');
    const ratings = [];
    
    for (const opp of opportunities) {
      const userId = opp.querySelector('.star').dataset.user;
      const selectedStars = opp.querySelectorAll('.star[style*="gold"]').length;
      const comment = opp.querySelector('.rating-comment').value;
      
      if (selectedStars > 0) {
        ratings.push({ userId, rating: selectedStars, comment });
      }
    }
    
    if (ratings.length === 0) {
      showMessage('Please select at least one rating', 'error');
      return;
    }
    
    // Submit all ratings
    for (const rating of ratings) {
      await submitRating(auth.currentUser.uid, rating.userId, rating.rating, rating.comment);
    }
    
    closeRatingModal();
    showMessage('Ratings submitted successfully!', 'success');
    
    // Reload profile to update rating display
    await loadProfile();
    
  } catch (error) {
    console.error('Error submitting ratings:', error);
    showMessage('Error submitting ratings: ' + error.message, 'error');
  }
};

// Close rating modal
window.closeRatingModal = function() {
  const modal = document.querySelector('.rating-modal');
  if (modal) modal.remove();
};

// Show loading state
function showLoadingState() {
  const containers = ['user-rides', 'user-bookings'];
  containers.forEach(id => {
    const container = document.getElementById(id);
    if (container) {
      container.innerHTML = '<div class="loading">Loading...</div>';
    }
  });
}

// Hide loading state
function hideLoadingState() {
  // Loading states will be replaced by actual content
}

// Show message
function showMessage(message, type = 'info') {
  // Remove existing messages
  const existingMsg = document.querySelector('.message');
  if (existingMsg) existingMsg.remove();
  
  const msgDiv = document.createElement('div');
  msgDiv.className = `message message-${type}`;
  msgDiv.textContent = message;
  msgDiv.style.cssText = `
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 8px;
    font-weight: 600;
    text-align: center;
    ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
      type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' :
      'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;'}
  `;
  
  const container = document.querySelector('.profile-container') || document.querySelector('main');
  container.insertBefore(msgDiv, container.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (msgDiv.parentNode) msgDiv.remove();
  }, 5000);
}

// Initialize profile when page loads
document.addEventListener('DOMContentLoaded', () => {
  if (auth.currentUser) {
    loadProfile();
  } else {
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      if (user) {
        loadProfile();
      } else {
        window.location.href = 'auth.html';
      }
    });
  }
}); 