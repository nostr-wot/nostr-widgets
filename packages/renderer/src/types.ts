export type ProfileData = {
  npub: string;
  displayName: string;
  nip05?: string;
  pictureDataUri?: string;
  wotScore?: number;
  followerCount?: number;
};

export type FollowData = {
  npub: string;
  displayName: string;
  pictureDataUri?: string;
  followerCount?: number;
};

export type FeedNote = {
  id: string;
  createdAt: number;
  content: string;
};

export type FeedData = {
  npub: string;
  displayName: string;
  pictureDataUri?: string;
  notes: FeedNote[];
};

export type FeedLimit = 1 | 2 | 3 | 4 | 5;
