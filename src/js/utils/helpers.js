export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

// Placeholder for smart matching
export function matchRides(rides, filters) {
  // Simple: filter by pickup area and time window
  return rides.filter(ride => {
    if (filters.pickupArea && ride.pickupArea !== filters.pickupArea) return false;
    // Add more logic as needed
    return true;
  });
} 