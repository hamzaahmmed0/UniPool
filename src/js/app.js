import { auth, db } from './firebase-config.js';

window.showSection = function(sectionId) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
};

console.log('Firebase initialized:', auth, db); 