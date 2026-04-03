// USER
export type User = {
  id: string;
  name: string;
  image: string | null;
};

// GROUP
export type Group = {
  id: string;
  name: string;
  image: string | null;
  leader_id?: string;
  description?: string | null;
  member_count?: number;
};

// POST
export type Post = {
  id: string;
  title: string;
  created_at: string | null;
  upvotes: number;
  nr_of_comments: number;
  image: string | null;
  description: string | null;
  group: Group;
  user: User;
  poll?: Poll | null;
  streak: number;
};

// COMMENT
export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  comment: string;
  created_at: string | null;
  upvotes: number;
  user: User;
  replies: Comment[];
};

// GROUP MEMBERSHIP
export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string | null;
};

// GROUP CHAT
export type GroupMessage = {
  id: string;
  group_id: string;
  user: User;
  message: string;
  image_url?: string | null;
  created_at: string | null;
  reply_to?: {
    id: string;
    message: string;
    user_name: string;
  } | null;
};

// POLLS
export type Poll = {
  id: string;
  post_id: string;
  question: string;
  created_at: string | null;
  options: PollOption[];
};

export type PollOption = {
  id: string;
  poll_id: string;
  text: string;
  votes_count: number;
  image_url?: string | null;
};

export type PollVote = {
  poll_id: string;
  option_id: string;
  user_id: string;
};

// USER STREAKS
export type UserStreak = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

// CHALLENGES
export type Challenge = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_by: string;
};

export type ChallengeEntry = {
  id: string;
  challenge_id: string;
  user_id: string;
  content: string;
  created_at: string | null;
  votes: number | null;
};

// NOTIFICATIONS
export type NotificationType =
  | "comment"
  | "post"
  | "poll"
  | "challenge"
  | "message";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
