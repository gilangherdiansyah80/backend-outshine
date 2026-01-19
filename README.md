# Backend Outshine API

Express.js API backend deployed on Vercel with Supabase PostgreSQL database.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

4. Configure your Supabase credentials in `.env`:

   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
├── api/                      # Vercel serverless functions entry point
│   └── index.js              # Main entry point for Vercel
├── src/
│   ├── config/               # Configuration files
│   │   ├── database.js       # Supabase/PostgreSQL connection
│   │   └── index.js          # Environment config
│   ├── controllers/          # Request handlers
│   ├── middlewares/          # Custom middlewares
│   ├── models/               # Database models/schemas
│   ├── routes/               # Route definitions
│   ├── services/             # Business logic layer
│   ├── utils/                # Utility/helper functions
│   ├── validators/           # Request validation
│   └── app.js                # Express app configuration
├── .env.example              # Environment variables template
├── vercel.json               # Vercel deployment config
└── package.json              # NPM dependencies
```

## 🔗 API Endpoints

### Health Check

- `GET /api/health` - API health status
- `GET /api/health/db` - Database connection status

### Root

- `GET /` - API welcome message

## 🚢 Deployment to Vercel

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:

   ```bash
   vercel login
   ```

3. Deploy:

   ```bash
   vercel
   ```

4. Set environment variables in Vercel Dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 📝 Adding New Routes

1. Create controller in `src/controllers/`
2. Create route file in `src/routes/`
3. Register route in `src/routes/index.js`

Example:

```javascript
// src/routes/index.js
const userRoutes = require("./user.routes");
router.use("/users", userRoutes);
```

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL
- **Deployment**: Vercel Serverless Functions

## 📄 License

ISC
