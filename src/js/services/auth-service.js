import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Validate FCC email format
function validateFCCEmail(email) {
  const fccPattern = /^[a-zA-Z0-9._%+-]+@fccollege\.edu\.pk$/;
  return fccPattern.test(email);
}

// Register a new user and create Firestore profile
export async function registerUser(email, password, name, role = 'Rider') {
  try {
    // Validate FCC email
    if (!validateFCCEmail(email)) {
      throw new Error('Please use your FCC email address (@fccollege.edu.pk)');
    }
    
    // Validate password strength
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    
    // Validate name
    if (!name || name.trim().length < 2) {
      throw new Error('Please enter a valid name (at least 2 characters)');
    }
    
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Store additional user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name: name.trim(),
      email: email,
      role: role,
      createdAt: new Date().toISOString(),
      ridesCompleted: 0,
      averageRating: 0,
      totalRatings: 0
    });
    
    return { success: true, user };
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific Firebase auth errors
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('An account with this email already exists');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address');
      case 'auth/weak-password':
        throw new Error('Password is too weak. Please choose a stronger password');
      default:
        throw new Error(error.message || 'Registration failed. Please try again.');
    }
  }
}

// Sign in user
export async function signInUser(email, password) {
  try {
    // Validate email format
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    
    // Validate password
    if (!password || password.length < 1) {
      throw new Error('Please enter your password');
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Sign in error:', error);
    
    // Handle specific Firebase auth errors
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email address');
      case 'auth/wrong-password':
        throw new Error('Incorrect password');
      case 'auth/invalid-email':
        throw new Error('Please enter a valid email address');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later');
      default:
        throw new Error('Sign in failed. Please check your credentials and try again.');
    }
  }
}

// Sign out user
export async function signOutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    throw new Error('Sign out failed. Please try again.');
  }
}

// Get current user data from Firestore
export async function getCurrentUserData() {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { uid: user.uid, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Check if user is authenticated
export function isAuthenticated() {
  return auth.currentUser !== null;
}

// Listen for authentication state changes
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Update user profile
export async function updateUserProfile(updates) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    // Validate updates
    if (updates.name && updates.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }
    
    if (updates.email && !validateFCCEmail(updates.email)) {
      throw new Error('Please use a valid FCC email address');
    }
    
    // Update in Firestore
    const userRef = doc(db, 'users', user.uid);
    const updateData = {};
    
    if (updates.name) updateData.name = updates.name.trim();
    if (updates.role) updateData.role = updates.role;
    
    await setDoc(userRef, updateData, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

// Delete user account
export async function deleteUserAccount() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    
    // Delete user data from Firestore
    await setDoc(doc(db, 'users', user.uid), {}, { merge: true });
    
    // Delete the user account
    await user.delete();
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    throw new Error('Failed to delete account. Please try again.');
  }
} 