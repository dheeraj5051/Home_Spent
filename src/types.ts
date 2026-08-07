export type SplitMethod = "equal" | "percentage" | "custom" | "weighted" | "exact";
export type GroupRole = "admin" | "moderator" | "member";
export type SettlementStatus = "paid" | "pending" | "partial" | "cancelled";
export type AppTab = "dashboard" | "groups" | "add" | "activity" | "settings";

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  joinedAt: string;
  totalPaid: number;
  totalOwed: number;
  totalReceivable: number;
  groupsJoined: number;
  groupsCreated: number;
  recentActivity: string[];
}

export interface GroupEntity {
  id: string;
  groupId: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  currency: string;
  startDate: string;
  endDate?: string | null;
  month: number;
  year: number;
  budgetLimit?: number | null;
  category?: string | null;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  role: GroupRole;
  favorite?: boolean;
}

export interface MemberSummary {
  userId: string;
  username: string;
  fullName: string;
  role: GroupRole;
  avatarUrl?: string | null;
  paid: number;
  owed: number;
  receivable: number;
  joinedAt: string;
}

export interface ExpenseSplit {
  userId: string;
  value: number;
}

export interface ExpenseEntity {
  id: string;
  groupId: string;
  title: string;
  description: string;
  amount: number;
  payerId: string;
  splitMethod: SplitMethod;
  category: string;
  tags: string[];
  notes?: string | null;
  expenseDate: string;
  expenseTime: string;
  gpsLocation?: string | null;
  receiptUrl?: string | null;
  status: "active" | "deleted" | "restored";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  splits: ExpenseSplit[];
  attachments: string[];
  monthKey: string;
}

export interface SettlementEntity {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: SettlementStatus;
  note?: string | null;
  proofUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderEntity {
  id: string;
  groupId?: string | null;
  title: string;
  description?: string | null;
  reminderAt: string;
  recurringRule?: string | null;
  attachmentUrl?: string | null;
  enabled: boolean;
}

export interface ActivityLogEntity {
  id: string;
  groupId?: string | null;
  actorId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface NotificationEntity {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ThemeTokens {
  background: string;
  backgroundAlt: string;
  text: string;
  subtext: string;
  card: string;
  cardBorder: string;
  accent: string;
  accentSoft: string;
  accentSecondary: string;
  danger: string;
  success: string;
  warning: string;
  chip: string;
  chipText: string;
  input: string;
  shadow: string;
}
