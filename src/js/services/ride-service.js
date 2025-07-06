import { db } from '../firebase-config.js';
import {
  collection, addDoc, getDocs, query, where, onSnapshot, doc, updateDoc, arrayUnion, getDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Post a new ride (with recurring support)
export async function postRide(ride) {
  try {
    return await addDoc(collection(db, 'rides'), ride);
  } catch (error) {
    console.error('Error posting ride:', error);
    throw new Error('Failed to post ride. Please try again.');
  }
}

// List all rides, with optional filters
export async function listRides(filters = {}) {
  try {
    let q = collection(db, 'rides');
    // Add filter logic here if needed (e.g., by date, route, etc.)
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error listing rides:', error);
    throw new Error('Failed to load rides. Please try again.');
  }
}

// Real-time listener for rides
export function listenRides(callback) {
  try {
    return onSnapshot(collection(db, 'rides'), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Error in rides listener:', error);
    });
  } catch (error) {
    console.error('Error setting up rides listener:', error);
  }
}

// Book a ride (add user to passengers array) with validation
export async function bookRide(rideId, userId) {
  try {
    const rideRef = doc(db, 'rides', rideId);
    const rideDoc = await getDoc(rideRef);
    
    if (!rideDoc.exists()) {
      throw new Error('Ride not found');
    }
    
    const rideData = rideDoc.data();
    
    // Check if ride is still active
    if (rideData.status !== 'active') {
      throw new Error('This ride is no longer available');
    }
    
    // Check if user is already a passenger
    if (rideData.passengers && rideData.passengers.includes(userId)) {
      throw new Error('You have already booked this ride');
    }
    
    // Check if there are available seats
    const currentPassengers = rideData.passengers ? rideData.passengers.length : 0;
    const availableSeats = parseInt(rideData.seats) || 0;
    
    if (currentPassengers >= availableSeats) {
      throw new Error('No seats available for this ride');
    }
    
    // Add user to passengers
    await updateDoc(rideRef, {
      passengers: arrayUnion(userId)
    });
    
    return { success: true, message: 'Ride booked successfully!' };
  } catch (error) {
    console.error('Error booking ride:', error);
    throw error;
  }
}

// Get rides for a specific user (as driver)
export async function getUserRides(userId) {
  try {
    const q = query(collection(db, 'rides'), where('driverId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user rides:', error);
    throw new Error('Failed to load your rides');
  }
}

// Get bookings for a user (rides where user is a passenger)
export async function getUserBookings(userId) {
  try {
    const q = query(collection(db, 'rides'), where('passengers', 'array-contains', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user bookings:', error);
    throw new Error('Failed to load your bookings');
  }
}

// Cancel a booking (remove user from passengers)
export async function cancelBooking(rideId, userId) {
  try {
    const rideRef = doc(db, 'rides', rideId);
    const rideDoc = await getDoc(rideRef);
    
    if (!rideDoc.exists()) {
      throw new Error('Ride not found');
    }
    
    const rideData = rideDoc.data();
    const passengers = rideData.passengers || [];
    
    if (!passengers.includes(userId)) {
      throw new Error('You are not booked for this ride');
    }
    
    // Remove user from passengers
    const updatedPassengers = passengers.filter(p => p !== userId);
    await updateDoc(rideRef, {
      passengers: updatedPassengers
    });
    
    return { success: true, message: 'Booking cancelled successfully!' };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
}

// Mark a ride as completed
export async function completeRide(rideId) {
  try {
    const rideRef = doc(db, 'rides', rideId);
    await updateDoc(rideRef, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    
    // Update rides completed count for all participants
    const rideDoc = await getDoc(rideRef);
    const rideData = rideDoc.data();
    const participants = [rideData.driverId, ...(rideData.passengers || [])];
    
    for (const userId of participants) {
      if (userId) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const currentRides = userDoc.data().ridesCompleted || 0;
          await updateDoc(userRef, {
            ridesCompleted: currentRides + 1
          });
        }
      }
    }
    
    return { success: true, message: 'Ride marked as completed!' };
  } catch (error) {
    console.error('Error completing ride:', error);
    throw error;
  }
} 