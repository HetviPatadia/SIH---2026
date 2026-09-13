# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

The development team takes the security and integrity of the **MPLADS AI Audit Intelligence System** seriously.

If you believe you have found a security vulnerability in this project:
1. **Do not disclose the issue publicly** (e.g. in public GitHub issues, discussions, or social media).
2. Please open a Private Vulnerability Advisory on GitHub or email the project maintainers with:
   - A clear description of the vulnerability and attack vector.
   - Proof-of-concept steps or code to reproduce.
   - Potential impact on audit data confidentiality, integrity, or availability.
3. We will acknowledge receipt within 48 hours and work with you to patch and verify the fix prior to public release.

---

## Security Best Practices for Deployment

- **Environment Secrets**: Never commit `.env` files, production JWT secrets, or production database credentials to version control.
- **Role-Based Access Control (RBAC)**: Ensure internal audit endpoints (`/api/investigations`, `/api/projects`, `/api/reports`) are protected by valid JWT bearer tokens with appropriate auditor roles.
- **Database Hardening**: When migrating from SQLite to PostgreSQL + PostGIS in production, use strong passwords, encrypted connections (SSL/TLS), and restricted network access.
- **Citizen Privacy**: Ensure that personal identifiable information (PII) submitted via citizen grievance channels is sanitized or redacted according to applicable privacy regulations.
