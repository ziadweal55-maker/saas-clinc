# Clinic SaaS Backend API

This is the Express.js multi-tenant backend API for the SaaS Clinic Manager.

## Features
- **Multi-Tenant Isolation**: Uses PostgreSQL schemas (`tenant_<id>`) for complete data separation between clinics.
- **Dynamic Provisioning**: Automatically creates new database schemas and seeds default lookup tables (regions, exercises, etc.) when a new clinic registers.
- **JWT Authentication**: Secure stateless authentication with cross-tenant context validation.
- **Compatible Schema**: Ported directly from the SQLite desktop schemas.

---

## Getting Started

### 1. Prerequisites
Make sure you have Node.js (v18+) and Docker installed.

### 2. Run PostgreSQL Database
Start the PostgreSQL container in the background:
```bash
docker-compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
The server will start on `http://localhost:3000`. On first boot, it automatically initializes the global public tables (`tenants`, `subscriptions`).

---

## SaaS Provisioning Flow

### Step 1: Register a New Tenant (Clinic)
Send a POST request to create a tenant. This will:
1. Add the tenant to the global `tenants` table.
2. Initialize their schema `tenant_<id>`.
3. Create all 28+ clinical database tables inside that schema.
4. Insert their primary admin user.

**Endpoint:** `POST /api/v1/global/register`
**Body:**
```json
{
  "tenantId": "revive",
  "clinicName": "Revive Physiotherapy Clinic",
  "email": "admin@revive.com",
  "password": "strongpassword123",
  "primaryColor": "#C8102E",
  "whatsappNumber": "201000000000"
}
```

### Step 2: Log In to the Tenant Workspace
When logging in, pass the tenant subdomain context (either via subdomain header or `x-tenant-id` header during local development).

**Endpoint:** `POST /api/v1/auth/login`
**Headers:**
`x-tenant-id`: `revive`
**Body:**
```json
{
  "username": "admin@revive.com",
  "password": "strongpassword123"
}
```
**Response:**
Returns a JWT token `token`. Save this token.

### Step 3: Access Scoped Resources
Pass the token in the `Authorization` header and the tenant ID in `x-tenant-id` header.

**Endpoint:** `GET /api/v1/clients`
**Headers:**
`Authorization`: `Bearer <JWT_TOKEN>`
`x-tenant-id`: `revive`

---

## Directory Structure

```
clinic-api/
├── src/
│   ├── config/
│   │   └── db.js            # PostgreSQL connection pool
│   ├── controllers/
│   │   └── authController.js # Auth actions (login, registrations)
│   │   └── tenantController.js # SaaS signup & webhooks
│   ├── middlewares/
│   │   └── auth.js          # JWT & cross-tenant access verification
│   │   └── tenant.js        # Dynamic schema router
│   ├── routes/
│   │   ├── global.js        # SaaS signup, webhooks
│   │   ├── auth.js          # Tenant logins, user management
│   │   ├── branches.js      # Branches CRUD
│   │   ├── clients.js       # Clients CRUD
│   │   └── doctors.js       # Doctors CRUD
│   ├── scripts/
│   │   └── migrate.js       # Global and tenant SQL schemas
│   └── server.js            # Express API bootstrap
├── docker-compose.yml       # Dev DB container config
├── package.json
└── .env
```
