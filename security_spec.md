# G-TEC MM Panel — Security Specification

## 1. Data Invariants
1. **Strict Tenant & PII Isolation**: Every `Course`, `Student`, and `AttendanceRecord` carries an immutable `ownerId` matching `request.auth.uid`. No user can read, list, create, update, or delete records owned by another UID.
2. **Verified Identity**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Referential Integrity**: A `Student` cannot be created unless `course1Id` points to an existing `Course` document owned by the same user (`exists()` + `get().data.ownerId == request.auth.uid`).
4. **Master Gate on Subcollections**: An `AttendanceRecord` under `/students/{studentId}/attendance/{dateStr}` requires verifying parent `/students/{studentId}` ownership via `get()` on write and delete, and matching `studentId`, `date`, and `ownerId` fields.
5. **Bounded Collections & Strict Schemas**: `softwares` on `Course` is bounded to 1–12 items; `completedSoftwares` on `Student` is bounded to 0–24 items; every string has explicit `.size()` limits; `createdAt` is immutable and validated against `request.time`; `updatedAt` is validated against `request.time`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated List**: Query `/students` without `request.auth`.
2. **Cross-Tenant List**: Authenticated user B queries `/students` where `ownerId == userA`.
3. **Unverified Email Write**: User signs up with unverified email (`email_verified == false`) and attempts to create `/courses/c1`.
4. **Shadow Field Injection**: Create `/students/s1` with an injected `isAdmin: true` ghost field (`hasOnly` rejects).
5. **Owner Spoofing on Create**: Create `/students/s1` with `ownerId: "victim_uid"`.
6. **Owner Hijack on Update**: Update `/courses/c1` changing `ownerId` to another UID.
7. **Timestamp Forgery**: Create `/courses/c1` with a backdated `createdAt` not equal to `request.time`.
8. **Immortal Field Mutation**: Update `/students/s1` changing `createdAt`.
9. **ID Poisoning**: Create `/students/invalid$id!with*bad_chars_and_huge_length` (`isValidId` rejects).
10. **Denial-of-Wallet Resource Exhaustion**: Create `/courses/c1` with a 50KB `fullName` or 100 items in `softwares`.
11. **Orphaned Student Record**: Create `/students/s1` referencing a non-existent `course1Id: "fake_course"`.
12. **Subcollection Master Gate Bypass**: Create `/students/{otherUsersStudent}/attendance/2026-11-15` claiming `ownerId == attackerUid`.
