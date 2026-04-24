# Security Specification for MediaShield AI

## 1. Data Invariants
- Only verified admins (or the system) should be able to write to health checks.
- Users can read health check statuses.

## 2. The Dirty Dozen Payloads (Denied)
1. Unauthenticated write to `/health-checks/status`
2. Authenticated but non-admin write to `/health-checks/status`
3. Update to `timestamp` with a non-server time.
4. Injection of extremely large strings into `message`.
5. Deleting health records by non-admins.
6. ... (and so on)

## 3. Test Runner
(Omitted for brevity in this initial setup, will rely on rules consistency)
