# 🧵 TextileHub — B2B Textile Marketplace

A functional prototype of a B2B textile marketplace connecting **buyers** and **suppliers**, built for the Marketplace Hackathon. Buyers discover fabrics with an AI assistant (chat, voice, natural-language search, recommendations, comparison, product Q&A); suppliers manage inventory and fulfill orders. Payments, escrow and logistics are intentionally out of scope.

**Live demo credentials** (password `demo1234`):
- Buyer: `buyer@textilehub.in`
- Suppliers: `weaver@textilehub.in` · `mills@textilehub.in` · `woolworks@textilehub.in`

---

## Tech stack

| Layer     | Choice                                                        | Why |
|-----------|---------------------------------------------------------------|-----|
| Backend   | **FastAPI** (Python)                                          | Modern REST APIs, auto docs, Pydantic validation |
| Database  | **PostgreSQL** (free via Neon) · SQLite for local dev         | Relational integrity for orders/inventory |
| ORM       | SQLAlchemy 2.0                                                | Clean, type-safe models |
| Auth      | JWT (python-jose) + bcrypt, role-based access control         | Buyer/supplier RBAC |
| AI        | **Hugging Face Inference API** (free) + Web Speech API        | Custom LLM chat, semantic search, voice |
| Frontend  | **React 18 + Vite + Tailwind CSS v4**                         | Fast, responsive, mobile-first |
| Hosting   | Render (API) · Vercel (web) · Neon (DB) — all **free tiers**  | Zero-cost production deployment |

---

## Project structure

```
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── main.py          # app factory, CORS, static uploads
│   │   ├── config.py        # env-driven settings
│   │   ├── database.py      # engine / session
│   │   ├── models.py        # User, profiles, Category, Product, CartItem, Order…
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── security.py      # JWT + bcrypt
│   │   ├── deps.py          # auth & RBAC dependencies
│   │   ├── seed.py          # demo data (25 products, 3 suppliers, orders)
│   │   ├── api/             # auth, products, profiles, cart, orders, supplier, ai
│   │   └── services/
│   │       └── ai_service.py# HF Inference (chat/embeddings) + graceful fallback
│   ├── requirements.txt
│   ├── render.yaml          # Render blueprint (backend)
│   └── .env                 # local config
├── frontend/                # React + Vite + Tailwind
│   ├── src/
│   │   ├── context/         # Auth, Cart, Toast providers
│   │   ├── components/      # Navbar, ProductCard, AIChatWidget, status trackers…
│   │   └── pages/           # Landing, Products, ProductDetail, Onboarding,
│   │                        # Cart, Checkout, BuyerDashboard, Supplier*, Compare
│   ├── vercel.json
│   └── .env                 # VITE_API_URL
└── .env.example             # all config vars documented
```

---

## Features delivered

### Buyer experience
- Landing page, responsive nav, featured products, categories, search, filters (fabric, category, price, in-stock, sort), grid view
- **AI assistant "Loom"** floating across the journey: conversational chat, **voice input** (Web Speech API), natural-language search, profile-based recommendations, product comparison, similar products, product Q&A — powered by a Hugging Face LLM with a keyword fallback so it always works
- Product detail pages: images, colors, specs, stock, price, MOQ-aware carting, inline "Ask Loom"
- Register/login/logout + **AI chat & voice-assisted onboarding** (structured extraction) with manual form fallback
- Cart (add/update/remove/summary), checkout (shipping → review → place order), order confirmation, **buyer dashboard** with live order-status tracking

### Supplier experience
- AI chat & voice-assisted business onboarding
- Dashboard: total/active/out-of-stock/low-stock products, pending orders, recent orders, 7-day order-value chart, inventory alerts
- Inventory management: add/edit/delete products, upload images, mark available/out-of-stock
- Order management: view incoming orders with buyer details, update status (pending → accepted → preparing → ready for dispatch → completed)
- Supplier profile management

---

## Run locally

```bash
# 1. Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # SQLite is the default — no DB setup needed
python -m app.seed          # seeds demo data
uvicorn app.main:app --reload --port 8000
# API docs → http://localhost:8000/docs

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # → http://localhost:5173
```

### Enabling the full AI experience (free)
1. Create a free Hugging Face account → **Settings → Access Tokens** → new read token
2. Paste it as `HF_TOKEN` in `backend/.env`
3. Restart the backend. Chat, semantic search and onboarding extraction now use the LLM (e.g. `HuggingFaceH4/zephyr-7b-beta`, `sentence-transformers/all-MiniLM-L6-v2`). Free-tier inference models are frequently rate-limited; the app **falls back gracefully** to keyword intelligence, so the demo never breaks.

---

## Deploy for free (production)

| Service | What | How |
|---------|------|-----|
| **Neon** (database) | Free PostgreSQL | Sign up → create project → copy `DATABASE_URL` (use `postgresql+psycopg2://…?sslmode=require`) |
| **Render** (API) | Free web service | Create **Blueprint** → connect repo → `render.yaml` reads env vars; run seed once with `python -m app.seed` |
| **Vercel** (web) | Free static hosting | Import repo, root `frontend`, framework Vite; set `VITE_API_URL=https://your-api.onrender.com` |

Steps:
1. `git init && git add . && git commit` and push to GitHub
2. Neon: create database → copy URL
3. Render: New → Blueprint → select repo → fill `DATABASE_URL`, `SECRET_KEY`, `PUBLIC_BASE_URL`, optional `HF_TOKEN`, `FRONTEND_URL` = your Vercel URL → deploy → **run `python -m app.seed` once** (Shell tab)
4. Vercel: import repo → set `VITE_API_URL` to the Render URL → deploy

---

## API overview

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/register`, `/login`, `GET /api/auth/me` |
| Catalog | `GET /api/categories`, `/api/products` (search/filter/sort/paginate), `/api/products/{id}` |
| Profiles | `GET/POST /api/buyer/me/profile`, `/api/supplier/me/profile` |
| Cart | `GET /api/cart`, `POST/PATCH/DELETE /api/cart/items/...` |
| Orders | `POST /api/checkout`, `GET /api/buyer/orders`, `GET /api/supplier/orders`, `PATCH /api/supplier/orders/{id}/status` |
| Supplier | `GET /api/supplier/dashboard`, CRUD `/api/supplier/products`, image upload, `GET /api/supplier/orders/stats/last7days` |
| AI | `POST /api/ai/chat`, `/nl-search`, `/recommendations`, `/compare`, `/product-qa`, `/similar/{id}`, `/onboarding` |

Interactive docs at `/docs` (Swagger UI).
