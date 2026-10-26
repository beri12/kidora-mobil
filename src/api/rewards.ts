import { api } from './index';

export interface Wallet {
  coins: number;
  gems: number;
  xp: number;
  level: number;
  longestStreak: number;
}

export interface Avatar {
  body: string;
  skinColor: string;
  hair: string;
  face: string;
  clothes: string;
  accessories: string[];
  pet: string | null;
}

export interface AvatarItem {
  id: string;
  name: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
  assetUrl: string | null;
}

/**
 * Rewards are read-only from the app's side, except buying cosmetics with
 * coins the server already holds. There is deliberately no call that grants
 * XP or completes a mission from the client.
 */
export const rewardsApi = {
  wallet: () => api.get<Wallet>('/rewards'),
  avatar: () => api.get<Avatar>('/avatar'),
  avatarItems: (category?: string) => api.get<AvatarItem[]>('/avatar/items', { query: { category } }),
  updateAvatar: (patch: Partial<Avatar>) => api.put<Avatar>('/avatar', patch),
  purchase: (itemId: string) => api.post<{ wallet: Wallet }>('/rewards/purchase', { itemId }),
};
