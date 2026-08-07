export const GROUP_ROLES = ["admin", "moderator", "member"] as const;
export const TRANSACTION_STATUSES = ["paid", "pending", "partial", "cancelled"] as const;
export const SPLIT_METHODS = ["equal", "percentage", "custom", "weighted", "exact"] as const;
export const CATEGORIES = [
  "Rent",
  "Electricity",
  "Water",
  "Internet",
  "Food",
  "Grocery",
  "Gas",
  "Shopping",
  "Travel",
  "Medical",
  "Entertainment",
  "Maintenance",
  "Subscription",
  "Others"
] as const;
export const APP_TABS = ["dashboard", "groups", "add", "activity", "settings"] as const;
