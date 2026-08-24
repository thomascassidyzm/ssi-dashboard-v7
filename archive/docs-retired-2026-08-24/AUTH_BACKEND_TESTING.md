# Auth Backend Testing Guide

## Overview

The SSI Dashboard authentication system uses magic link authentication with S3-backed storage for users, tokens, and sessions.

## Architecture

### Storage Structure (S3: popty-bach-lfs/auth/)
```
auth/
├── users.json              # User registry
├── magic-links/            # Temporary magic link tokens
│   └── {token}.json       # Token data (email, expires)
└── sessions/               # Active user sessions
    └── {sessionId}.json   # Session data (email, user, expires)
```

### Auth Flow
1. User requests magic link (POST /api/auth/request-link)
2. System generates token, stores in S3, returns link
3. User clicks magic link (GET /api/auth/verify?token=xxx)
4. System validates token, creates session, returns sessionId
5. Client stores sessionId, includes in Authorization header
6. Protected endpoints validate session (GET /api/auth/me)

## Files Created

### Core Auth Library
- **/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/api/lib/auth.js**
  - getUser(email) - Fetch user from users.json
  - generateMagicLink(email) - Create magic link token
  - verifyMagicLink(token) - Validate and consume token
  - createSession(email) - Create new session
  - validateSession(sessionId) - Check session validity
  - deleteSession(sessionId) - Logout

### API Endpoints
- **/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/api/auth/request-link.js**
  - POST /api/auth/request-link
  - Body: { email: "user@example.com" }
  - Returns: { success, message, link (dev only) }

- **/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/api/auth/verify.js**
  - GET /api/auth/verify?token=xxx
  - Returns: { success, session, user, expires }

- **/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/api/auth/me.js**
  - GET /api/auth/me
  - Header: Authorization: Bearer {sessionId}
  - Returns: { user }

### Initialization Script
- **/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/init-auth-users.js**
  - Uploads initial users.json to S3
  - Configures kai@ssi.org and tom@ssi.org as admins

## Setup

### 1. Initialize Users in S3

```bash
node scripts/init-auth-users.js
```

This creates the users.json file in S3 with initial admin users.

### 2. Environment Variables

Ensure your .env file has:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-west-1
S3_BUCKET=popty-bach-lfs
BASE_URL=http://localhost:5173  # or your production URL
NODE_ENV=development  # or production
```

## Testing the Auth Flow

### Using curl

#### 1. Request a Magic Link
```bash
curl -X POST http://localhost:3000/api/auth/request-link \
  -H "Content-Type: application/json" \
  -d '{"email":"kai@ssi.org"}'
```

Response (development):
```json
{
  "success": true,
  "message": "Check your email for the login link",
  "link": "http://localhost:5173/auth/verify?token=abc123..."
}
```

#### 2. Verify Magic Link (Create Session)
```bash
curl "http://localhost:3000/api/auth/verify?token=abc123..."
```

Response:
```json
{
  "success": true,
  "session": "def456...",
  "user": {
    "name": "Kai",
    "role": "admin",
    "courses": "*"
  },
  "expires": 1733087654321
}
```

#### 3. Get Current User (Validate Session)
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer def456..."
```

Response:
```json
{
  "user": {
    "name": "Kai",
    "role": "admin",
    "courses": "*"
  }
}
```

### Using JavaScript (Frontend)

#### Request Magic Link
```javascript
const response = await fetch('/api/auth/request-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'kai@ssi.org' })
});
const data = await response.json();
console.log(data.link); // In development only
```

#### Verify Token
```javascript
const token = new URLSearchParams(window.location.search).get('token');
const response = await fetch(`/api/auth/verify?token=${token}`);
const { session, user } = await response.json();

// Store session in localStorage
localStorage.setItem('sessionId', session);
```

#### Validate Session
```javascript
const sessionId = localStorage.getItem('sessionId');
const response = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${sessionId}` }
});
const { user } = await response.json();
```

## Security Considerations

### Token TTL
- Magic links expire after 15 minutes
- Sessions expire after 7 days

### Token Consumption
- Magic link tokens are single-use (deleted after verification)
- Expired tokens return 401 errors

### CORS
- All endpoints support CORS for cross-origin requests
- In production, consider restricting origins

## Extending the System

### Adding Users

Edit the users.json in S3 or update the init script:

```json
{
  "users": {
    "new@user.com": {
      "name": "New User",
      "role": "viewer",
      "courses": "spa_for_eng"
    }
  }
}
```

### Adding Logout

Create `/api/auth/logout.js`:
```javascript
import { deleteSession } from '../lib/auth.js';

export default async function handler(req, res) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (sessionId) await deleteSession(sessionId);
  res.json({ success: true });
}
```

### Email Integration

In production, update `api/auth/request-link.js`:
```javascript
// Replace console.log with actual email sending
await sendEmail({
  to: email,
  subject: 'Your SSI Dashboard Login Link',
  body: `Click here to log in: ${magicLink}`
});
```

## Troubleshooting

### "User not found"
- Run `node scripts/init-auth-users.js` to create users.json
- Verify S3 bucket name and credentials

### "Invalid token"
- Token may be expired (15 min TTL)
- Token may have already been used
- Check S3 path: auth/magic-links/{token}.json

### "Invalid or expired session"
- Session may be expired (7 day TTL)
- Check S3 path: auth/sessions/{sessionId}.json
- Re-authenticate with magic link

### S3 Connection Issues
- Verify AWS credentials in .env
- Check S3 bucket exists and is accessible
- Verify region is correct (default: eu-west-1)

## Next Steps

1. Integrate with frontend login page
2. Add email sending service
3. Implement session refresh
4. Add rate limiting for magic link requests
5. Add audit logging
6. Consider adding 2FA for admin users
