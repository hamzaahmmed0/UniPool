import { postRide, listRides, listenRides } from '../services/ride-service.js';
import { auth, db } from '../firebase-config.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

window.searchRides = async function() {
  try {
    // Use real-time listener instead of one-time fetch
    listenRides(rides => {
      const ridesList = document.getElementById('rides-list');
      if (!ridesList) return;
      
      if (rides.length === 0) {
        ridesList.innerHTML = '<div class="empty-state"><i class="fas fa-car"></i><h4>No rides available</h4></div>';
        return;
      }
      
      ridesList.innerHTML = rides.map(ride => `
        <div class="ride-card">
          <div class="ride-header">
            <span class="ride-route">${ride.pickupArea || 'Campus'} &rarr; ${ride.destination || 'Downtown'}</span>
            <span class="ride-time-badge">${ride.time ? formatTime(ride.time) : '--:-- --'}</span>
          </div>
          <div class="ride-details">
            <span class="ride-detail"><strong>Driver:</strong> ${ride.driverName || 'N/A'}</span>
            <span class="ride-detail"><strong>Available Seats:</strong> ${ride.seats || 'N/A'}</span>
            <span class="ride-detail"><strong>Date:</strong> ${ride.date || 'N/A'}</span>
          </div>
          <div class="ride-detail"><strong>Type:</strong> ${ride.recurring || 'One-time'}</div>
        </div>
      `).join('');
    });
  } catch (error) {
    console.error('Error loading rides:', error);
    const ridesList = document.getElementById('rides-list');
    if (ridesList) {
      ridesList.innerHTML = '<div class="error-message">Error loading rides. Please try again.</div>';
    }
  }
};

function formatTime(time) {
  // Format time as HH:MM AM/PM
  if (!time) return '';
  const [hour, minute] = time.split(":");
  let h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
}

const postRideForm = document.getElementById('post-ride-form');
if (postRideForm) {
  postRideForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = postRideForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
      // Disable button and show loading
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Posting...';
      
      // Validate user is logged in
      if (!auth.currentUser) {
        throw new Error('You must be logged in to post a ride');
      }
      
      // Get user data for driver name
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const driverName = userDoc.exists() ? userDoc.data().name : 'Unknown Driver';
      
      const ride = {
        driverId: auth.currentUser.uid,
        driverName: driverName,
        pickupArea: document.getElementById('ride-pickup').value,
        destination: document.getElementById('ride-destination').value,
        date: document.getElementById('ride-date').value,
        time: document.getElementById('ride-time').value,
        seats: document.getElementById('ride-seats').value,
        recurring: document.getElementById('ride-recurring').value,
        notes: document.getElementById('ride-notes').value,
        status: 'active',
        passengers: [],
        createdAt: new Date().toISOString()
      };
      
      // Validate required fields
      if (!ride.pickupArea || !ride.destination || !ride.date || !ride.time || !ride.seats) {
        throw new Error('Please fill in all required fields');
      }
      
      await postRide(ride);
      
      // Show success message
      showMessage('Ride posted successfully!', 'success');
      
      // Reset form
      postRideForm.reset();
      
      // Redirect to find-rides.html if on post-ride.html
      if (window.location.pathname.endsWith('post-ride.html')) {
        setTimeout(() => {
          window.location.href = 'find-rides.html';
        }, 1500);
      }
      
    } catch (error) {
      console.error('Error posting ride:', error);
      showMessage(error.message || 'Error posting ride. Please try again.', 'error');
    } finally {
      // Restore button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// Helper function to show messages
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
  
  const container = document.querySelector('.ride-form-panel') || document.querySelector('main');
  container.insertBefore(msgDiv, container.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (msgDiv.parentNode) msgDiv.remove();
  }, 5000);
}

// Auto-load rides in real-time on page load
if (document.getElementById('rides-list')) {
  window.searchRides();
} 