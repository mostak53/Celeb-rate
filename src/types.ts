export interface UserProfile {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

export interface CelebrityImage {
  id: string;
  imageURL: string;
  person_name: string;
  tags: string[];
  upload_time: any; // Firestore Timestamp
}

export interface Rating {
  id: string;
  userId: string;
  imageId: string;
  rating: number;
  timestamp: any; // Firestore Timestamp
}
