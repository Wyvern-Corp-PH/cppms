# 02 — User names instead of ids

**What to build:** Allocated By, Updated By, and Approved By show name (then email, then id) for Province, Municipality, and Barangay — the same display Super Admin already sees. Stored relation stays the user id. Actor names only on surfaces that already show Actor (activity logs / Super Admin). Do not grant users-list or activity-log view to other roles.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Province, Municipality, and Barangay see names on Allocated By, Updated By, and Approved By when name or email is available
- [x] `users.listRule` stays Super Admin-only; `users.viewRule` allows authenticated whole-row view-by-id (no field-level ACL)
- [x] Actor (`actor_user`) is resolved only where the Actor column already renders; no `activity_logs.view` grant
- [x] Stored ids unchanged; Super Admin display does not regress
