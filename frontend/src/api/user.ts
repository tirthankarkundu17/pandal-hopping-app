import { api } from './client';

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  baseLocation?: GeoJSONPoint;
  createdAt: string;
  updatedAt: string;
}

export const userApi = {
  getProfile: async (): Promise<UserProfile> => {
    const res = await api.get<{ user: UserProfile }>('/users/me');
    return res.data.user;
  },

  updateBaseLocation: async (latitude: number, longitude: number): Promise<UserProfile> => {
    const res = await api.put<{ user: UserProfile }>('/users/me/base-location', {
      latitude,
      longitude,
    });
    return res.data.user;
  },
};
