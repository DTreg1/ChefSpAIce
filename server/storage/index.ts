import { StorageRoot } from './StorageRoot';
import { db } from '../db';

// Create the root storage instance with three-tier architecture
// Access patterns:
// - User tier: storage.user.food, storage.user.recipes, etc.
// - Admin tier: storage.admin.billing, storage.admin.security, etc.
// - Platform tier: storage.platform.analytics, storage.platform.ai, etc.
export const storage = new StorageRoot(db);