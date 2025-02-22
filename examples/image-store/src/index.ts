import dotenv from 'dotenv';
import { ImageStore } from './server';

// Load environment variables
dotenv.config();

// Check required environment variables
const requiredEnvVars = [
  'NOSTR_PUBLIC_KEY',
  'NOSTR_PRIVATE_KEY',
  'NOSTR_RELAY_URL'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Start the image store
const store = new ImageStore();

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await store.stop();
  process.exit(0);
});

store.start().catch(error => {
  console.error('Failed to start:', error);
  process.exit(1);
});