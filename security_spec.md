# Security Specification (`security_spec.md`) — KreditKu

## 1. Data Invariants
1. **Strict Multi-Tenant Owner Isolation**: Every document across `/users/{userId}`, `/settings/{userId}`, `/customers/{customerId}`, `/loans/{loanId}`, `/installments/{installmentId}`, `/payments/{paymentId}`, `/notifications/{notificationId}`, and `/audit_logs/{logId}` MUST have `ownerId == request.auth.uid` and require `request.auth.token.email_verified == true`.
2. **Relational Consistency**:
   - A `Loan` can only be created if its `customerId` references a `Customer` owned by `request.auth.uid`.
   - An `Installment` can only be created if its `loanId` references a `Loan` owned by `request.auth.uid`.
   - A `Payment` can only be created if its `loanId` and `installmentId` reference documents owned by `request.auth.uid`.
3. **Immutability & Financial Integrity**:
   - `ownerId` and `createdAt` can NEVER be modified after creation.
   - `Payment` records can NEVER be deleted (`allow delete: if false`) and once marked `status == 'void'`, cannot be updated further.
   - `AuditLog` records are strictly append-only (`allow update, delete: if false`).
   - All financial amounts (`itemPrice`, `downPayment`, `principalAmount`, `totalObligation`, `amount`, `paidAmount`, `remainingBalance`) must be non-negative numbers (`>= 0`).

## 2. The "Dirty Dozen" Payloads
1. **Cross-Tenant Read**: User B (`uid_b`) attempts `get` or `list` on `/customers` where `ownerId == 'uid_a'`. -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Create**: User A creates `/customers/cust_1` with `ownerId: 'uid_b'`. -> `PERMISSION_DENIED`.
3. **Shadow Field Injection**: User A creates `/customers/cust_1` with an undeclared field `nik: '1234567890'`. -> `PERMISSION_DENIED`.
4. **Unverified Email Write**: Authenticated token with `email_verified: false` attempts to write to `/loans/loan_1`. -> `PERMISSION_DENIED`.
5. **Owner Reassignment on Update**: User A updates `/loans/loan_1` changing `ownerId` to `'uid_b'`. -> `PERMISSION_DENIED`.
6. **Negative Financial Value**: User A creates `/payments/pay_1` with `amount: -500000`. -> `PERMISSION_DENIED`.
7. **Permanent Deletion of Payment**: User A attempts `deleteDoc` on `/payments/pay_1`. -> `PERMISSION_DENIED`.
8. **Double-Modify Voided Payment**: User A attempts to update `/payments/pay_1` after its `status` is already `'void'`. -> `PERMISSION_DENIED`.
9. **Audit Log Tampering**: User A attempts to `update` or `delete` `/audit_logs/log_1`. -> `PERMISSION_DENIED`.
10. **ID Poisoning**: User A attempts to create a document with an invalid ID containing spaces or >128 chars. -> `PERMISSION_DENIED`.
11. **Timestamp Forgery**: User A attempts to create `/customers/cust_1` with a forged past/future `createdAt` not matching `request.time`. -> `PERMISSION_DENIED`.
12. **Orphaned Loan Creation**: User A attempts to create `/loans/loan_1` referencing a `customerId` owned by another user or non-existent customer. -> `PERMISSION_DENIED`.
