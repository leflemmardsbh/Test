# Auth testing
1. POST `/api/auth/login` with the seeded admin credentials.
2. Keep the returned token and call `/api/auth/me` with `Authorization: Bearer TOKEN`.
3. Call `/api/admin/stats`, `/api/modules`, and create/update/delete modules with the same header.
4. Invalid credentials must return 401 and non-admin users must not access admin routes.