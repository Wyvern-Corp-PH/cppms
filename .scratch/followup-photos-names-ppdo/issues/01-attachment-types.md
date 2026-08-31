# 01 — Attachment types match across photos

**What to build:** Project Photos and progress site photos accept the same file types as other attachment slots (PDF, Word, Excel, JPEG, PNG). New WEBP uploads are rejected; existing stored WEBP stays viewable. Every attachment-related upload keeps the existing 10 MiB max. UI accept and PocketBase mimeTypes both change.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Project Photos and site photos use the shared document accept string (`.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png`)
- [x] `projects.project_photos` and `progress_updates.site_photo` mimeTypes match the shared document MIME list (not image-only)
- [x] New `image/webp` uploads are rejected; existing WEBP filenames remain viewable/downloadable
- [x] Max size stays the existing 10 MiB constant on all attachment-related uploads — no new size
