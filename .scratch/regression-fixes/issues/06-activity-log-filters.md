# 06 — Activity Log filters (Actor / Action / Date)

**What to build:** Super Admins get an Activity Logs filter bar on Reports: Actor (names), Action type (Created, Edited, Approved, Deleted, and the other stored audit actions), and Date range (shared From / To picker). Changing a filter narrows the in-memory list immediately. Non–Super Admin roles still cannot see Activity Logs.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Super Admin sees Actor, Action type, and Date range filters
- [x] Filters AND together; unset = all; clearing restores the full list
- [x] List narrows as filters change (no Apply, no full page reload)
- [x] Province / Municipality / Barangay do not see the section
- [x] Admin client does not write `activity_logs` rows
