import { db } from '../firebase-config.js';
import {
  collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Submit a rating for another user
export async function submitRating(fromUserId, toUserId, rating, comment = '') {
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    // Prevent self-rating
    if (fromUserId === toUserId) {
      throw new Error('You cannot rate yourself');
    }
    
    // Check if user has already rated this person
    const existingRating = await getDocs(
      query(collection(db, 'ratings'), 
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId)
      )
    );
    
    if (!existingRating.empty) {
      throw new Error('You have already rated this user');
    }
    
    // Create rating document
    const ratingData = {
      fromUserId,
      toUserId,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'ratings'), ratingData);
    
    // Update user's average rating
    await updateUserAverageRating(toUserId);
    
    return { success: true, message: 'Rating submitted successfully!' };
  } catch (error) {
    console.error('Error submitting rating:', error);
    throw error;
  }
}

// Get all ratings for a user
export async function getUserRatings(userId) {
  try {
    const q = query(collection(db, 'ratings'), where('toUserId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user ratings:', error);
    throw new Error('Failed to load ratings');
  }
}

// Get average rating for a user
export async function getUserAverageRating(userId) {
  try {
    const ratings = await getUserRatings(userId);
    if (ratings.length === 0) return 0;
    
    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    return Math.round((total / ratings.length) * 10) / 10; // Round to 1 decimal
  } catch (error) {
    console.error('Error calculating average rating:', error);
    return 0;
  }
}

// Update user's average rating in their profile
async function updateUserAverageRating(userId) {
  try {
    const averageRating = await getUserAverageRating(userId);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      averageRating,
      totalRatings: (await getUserRatings(userId)).length
    });
  } catch (error) {
    console.error('Error updating user average rating:', error);
  }
}

// Check if user can rate (has completed 3+ rides)
export async function canUserRate(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return (userData.ridesCompleted || 0) >= 3;
  } catch (error) {
    console.error('Error checking if user can rate:', error);
    return false;
  }
}

// Get mutual rating opportunity (after ride completion)
export async function getMutualRatingOpportunity(rideId, currentUserId) {
  try {
    const rideDoc = await getDoc(doc(db, 'rides', rideId));
    if (!rideDoc.exists()) return null;
    
    const rideData = rideDoc.data();
    
    // Only show rating opportunity for completed rides
    if (rideData.status !== 'completed') return null;
    
    const participants = [rideData.driverId, ...(rideData.passengers || [])];
    
    // Find other participants that current user can rate
    const ratingOpportunities = [];
    
    for (const participantId of participants) {
      if (participantId && participantId !== currentUserId) {
        // Check if user has already rated this participant
        const existingRating = await getDocs(
          query(collection(db, 'ratings'), 
            where('fromUserId', '==', currentUserId),
            where('toUserId', '==', participantId)
          )
        );
        
        if (existingRating.empty) {
          // Get participant name
          const participantDoc = await getDoc(doc(db, 'users', participantId));
          const participantName = participantDoc.exists() ? participantDoc.data().name : 'Unknown User';
          
          ratingOpportunities.push({
            userId: participantId,
            name: participantName,
            role: participantId === rideData.driverId ? 'Driver' : 'Passenger'
          });
        }
      }
    }
    
    return ratingOpportunities;
  } catch (error) {
    console.error('Error getting mutual rating opportunity:', error);
    return [];
  }
}

// Get rating statistics for a user
export async function getUserRatingStats(userId) {
  try {
    const ratings = await getUserRatings(userId);
    if (ratings.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
    
    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average = Math.round((total / ratings.length) * 10) / 10;
    
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      distribution[r.rating]++;
    });
    
    return {
      average,
      total: ratings.length,
      distribution
    };
  } catch (error) {
    console.error('Error getting rating stats:', error);
    return {
      average: 0,
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
}
