# SplitNest

SplitNest is a premium Android expense-sharing app built with Expo React Native and TypeScript. It is designed for roommates, families, teams, travelers, and hostel groups who need fast expense entry, live balances, secure login, and cloud sync.

## What is included

- Premium mobile UI shell with dark and light theme support
- Auth-first flow for email/password and Google sign-in
- Offline cache with sync hooks
- Group creation, invite code flow, and member-based splitting
- Expense add/edit/delete/restore flow
- Settlement recording with status updates
- Reminders, activity log, analytics cards, and export helpers
- Supabase schema for Auth, PostgreSQL, Storage, Realtime, and RLS
- GitHub Actions workflow to build a release APK

## How the app works

1. Users sign in or register.
2. A profile is created and cached locally.
3. Users create groups and add members.
4. Expenses are added and split using supported methods.
5. The app calculates balances and settlement summaries instantly.
6. Data is cached offline and queued for sync.
7. When internet returns, the app syncs with Supabase and updates other devices.

## Does it need a server?

- Local-only mode: the app can run offline with local cache, but devices will not share data automatically.
- Full real-time mode: yes, you need Supabase enabled for shared login, cloud storage, realtime sync, and cross-phone updates.
- You do not need to build your own backend server if you use Supabase.

## Setup

1. Create a Supabase project.
2. Run [supabase-schema.sql](supabase-schema.sql) in the Supabase SQL editor.
3. Copy [.env.example](.env.example) to `.env` and fill the values.
4. Install dependencies with `npm install`.
5. Start the app with `npm run start`.

## Build APK with GitHub Actions

1. Push the project to GitHub.
2. Add Supabase secrets if you want cloud sync in the build.
3. Run the workflow in [.github/workflows/android-apk.yml](.github/workflows/android-apk.yml).
4. Download the APK artifact from the Actions run.

## Database notes

- Usernames and email addresses are unique.
- Group IDs are auto-generated like `SPLT-84HF72`.
- RLS is enabled on the core tables.
- The schema includes profiles, groups, members, expenses, splits, settlements, reminders, notifications, activity logs, receipts, export history, preferences, invites, and deletion tracking.
