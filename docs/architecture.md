# 🏗️ PULSENET DIGITAL ECOSYSTEM BLUEPRINTS

This document provides a highly technical, principal-level architectural breakdown of the **PulseNet** digital ecosystem.

---

## 1. Complete Architecture Diagram

PulseNet uses a highly modular, real-time decoupled architecture. This ensures that synchronous REST requests are separated from asynchronous messaging streams.

```
                   ┌────────────────────────────────────────┐
                   │               CLIENT UI                │
                   │    Vite React Single Page Application  │
                   └──────┬──────────────────────────┬──────┘
                          │                          │
           HTTP / REST    │                          │   WebSockets (persistent)
           JSON payloads  │                          │   typing, presence, msgs
                          ▼                          ▼
             ┌─────────────────────────┐   ┌─────────────────────────┐
             │       API ENGINE        │   │      SOCKET GATEWAY     │
             │     Express Server      │   │     Socket.io Node      │
             └────────────┬────────────┘   └────────────┬────────────┘
                          │                             │
                          │   Mongoose ODM Queries      │  Direct broadcast
                          ▼                             ▼
                    ┌───────────┐                 ┌───────────┐
                    │  DATABASE │ ◄───────────────┤   CACHE   │
                    │  MongoDB  │  Persist log    │   Redis   │
                    └───────────┘  optionally     └───────────┘
```

---

## 2. API Flow & Event-Driven Lifecycles

### A. HTTP REST Request Lifecycle
1. **Client Request**: Client fires a secure `fetch()` request (e.g., `POST /api/discussions`) containing a JWT Bearer token in the `Authorization` header.
2. **Proxy Redirection**: Vite Dev Server intercepts `/api` and forwards the request transparently to `http://localhost:5000`.
3. **Route Verification**: Express processes the request through routers, hitting the `protect` middleware.
4. **JWT Verification**: The JWT secret resolves. `req.user` is loaded with user fields (excluding hash).
5. **Controller Execution**: The Database operation is executed (e.g. creating thread schema). Response returns a formatted JSON payload.

### B. WebSockets Handshake and Real-Time Event Lifecycle
1. **Socket.io Handshake**: Client attempts socket connection. Authenication details are packaged inside `socket.handshake.auth.token`.
2. **WebSocket Middleware**: Socket.io middleware decodes the token, authenticates the database record, and binds user structures to `socket.user`.
3. **Presence Propagation**: On connection, user joins the online registry, and `online_users` is emitted to all active channels.
4. **Typing Loops**: When typing, clients emit `typing` with channel details. The server broadcasts a `typing_status` packet containing the user's name to all active socket connections in that room.
5. **Real-time Broadcast**: When sending a message:
   - Server validates text.
   - Message schema is persisted in MongoDB.
   - The populated record is broadcast to the room using `io.to(channel).emit('receive_msg', messageData)`.

---

## 3. Database Schema Blueprint & Relations

```
              ┌───────────────────┐
              │       USER        │
              └──────┬─────┬──────┘
                     │     │
            1:N      │     │ 1:N
         ┌───────────┘     └───────────┐
         ▼                             ▼
┌─────────────────┐           ┌─────────────────┐
│   DISCUSSION    │◄──────────┤     COMMENT     │
└────────┬────────┘    1:N    └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│     MESSAGE     │
└─────────────────┘
```

### A. User Document Model
- `_id`: ObjectId (Primary Key)
- `username`: String (Unique, Indexed)
- `email`: String (Unique, Lowercase)
- `password`: String (Hashed via Bcrypt, hidden in queries)
- `avatar`: String (RoboHash/DiceBear URL placeholder)
- `role`: String (Enum: `user`, `moderator`, `admin`)
- `bio`: String

### B. Discussion Document Model
- `_id`: ObjectId
- `title`: String
- `content`: String
- `author`: ObjectId (Ref User)
- `tags`: Array of Strings (Indexed for tag-based searches)
- `votes`: Array of `{ user: ObjectId, voteType: 'up'|'down' }`
- `voteScore`: Number (Pre-computed via pre-save Mongoose hook)
- `commentCount`: Number (Auto-incremented on new reply insertions)

### C. Comment Document Model
- `_id`: ObjectId
- `content`: String
- `discussion`: ObjectId (Ref Discussion)
- `author`: ObjectId (Ref User)
- `parentId`: ObjectId (Ref Comment, allows recursive replies)
- `votes`: Array of `{ user: ObjectId, voteType: 'up'|'down' }`
- `voteScore`: Number

### D. Message Document Model
- `_id`: ObjectId
- `channel`: String (Indexed for rapid channel logs)
- `sender`: ObjectId (Ref User)
- `text`: String
- `createdAt`: Date

---

## 4. Multi-Agent AI System (Innovation Lab Tier)

PulseNet implements an advanced Multi-Agent collaborative architecture to power moderation, trend analysis, and user assistance.

```
       ┌────────────────────────┐
       │   INCOMING CONTENT     │
       └──────────┬─────────────┘
                  ▼
       ┌────────────────────────┐
       │    SECURITY AGENT      │ (JWT / Rate Limits / Anomaly)
       └──────────┬─────────────┘
                  ▼
       ┌────────────────────────┐
       │    MODERATION AGENT    │ (Auto-flag toxic text)
       └──────────┬─────────────┘
                  ▼
       ┌────────────────────────┐
       │  RECOMMENDATION AGENT  │ (Suggest related threads / tags)
       └────────────────────────┘
```

1. **Security & Risk Detection Agent**: Intercepts packets, monitors connection attempts, blocks blacklisted IPs, and mitigates DDoS risk.
2. **Moderation Agent**: Scans thread titles, comments, and messages for spam and toxic text, auto-flagging records for human reviewers.
3. **Recommendation Agent**: Analyzes user behavior and tags to suggest relevant discussions and online members with similar interests.
