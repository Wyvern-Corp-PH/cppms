# 04 — Remove PPDO role

**What to build:** PPDO is no longer a live role. Existing PPDO accounts become Province. Super Admin and Province permission matrices stay the same except that PPDO is gone as a peer. New UI never offers PPDO. Historical audit text that already says PPDO may remain.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] ROLE is Super Admin, Province, Municipality, Barangay only
- [x] User create/edit, filters, badges, and seeds do not offer or use PPDO
- [x] Every existing PPDO account is remapped to Province (schema/select + data migration)
- [x] Super Admin and Province capabilities unchanged except PPDO is no longer a peer
- [x] Tests that treated PPDO as a live role now use Super Admin or Province
