# Security Specification

## 1. Data Invariants
- A task belongs to a single user and cannot be read or written by another user.
- A lesson belongs to a single user and cannot be read or written by another user.
- A user can only read and write their own profile document.
- IDs used for tasks and lessons must be string of size <= 128 characters, matching alphanumerics, hyphens, and underscores.

## 2. The "Dirty Dozen" Payloads (Designed to break safety)

1. **User Identity Spoofing**: Attempt to write a user document with a different UID.
2. **Task Identity Spoofing**: Attempt to write a task for a user with `userId` of another student.
3. **Lesson Identity Spoofing**: Attempt to write a lesson for another student's ID.
4. **Task Resource Poisoning**: Attempt to create a task with a 1.5KB long ID.
5. **Lesson Resource Poisoning**: Attempt to create a lesson with a 1.5KB long ID.
6. **User Shadow Update**: Attempt to inject extra non-schema properties (`isAdmin: true`) into user data.
7. **Task Shadow Update**: Attempt to inject extra non-schema properties (`isVerified: true`) into task data.
8. **Lesson Shadow Update**: Attempt to inject extra non-schema properties (`approved: true`) into lesson data.
9. **Invalid Types in Task**: Attempt to save task `completed` as a string instead of boolean.
10. **Invalid Types in Lesson**: Attempt to save lesson `subject` as a number instead of string.
11. **Anonymously Writing User Profiles**: Attempt to write user data with no authenticated credentials.
12. **Blanket Collection Scrape**: Attempt to fetch all users via blanket query without specifying the `userId`.

## 3. Test Runner
We will ensure that all operations that violate these data invariants are rejected with `PERMISSION_DENIED` by our Firestore Security Rules.
