/**
 * Get a random avatar path for a user
 * Uses a hash of the user identifier to ensure consistency per user
 * while appearing random
 */
export function getRandomAvatar(userId?: string | null): string {
  const avatars = ['avatar1.jpg', 'avatar2.jpg', 'avatar3.jpg', 'avatar4.jpg', 'avatar5.jpg', 'avatar6.jpg', 'avatar7.jpg', 'avatar8.jpg', 'avatar9.jpg', 'avatar10.jpg'];
  
  if (!userId) {
    // If no user ID, pick a truly random one
    const randomIndex = Math.floor(Math.random() * avatars.length);
    return `/images/${avatars[randomIndex]}`;
  }
  
  // Create a simple hash from the user ID to get consistent avatar per user
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % avatars.length;
  // return '/images/avatar10.jpg';
  return `/images/${avatars[index]}`;
}

