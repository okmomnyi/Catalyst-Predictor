# Catalyst Effect Predictor

An AI-powered web application that predicts catalyst effectiveness for chemical reactions. Built for science students and researchers, it uses large language models to provide detailed reaction analysis — including primary equations, side reactions, byproducts, thermodynamics, and ranked catalyst recommendations — all from a clean, modern interface.

---

## Features

- **Catalyst Prediction** — Enter your reactants and catalysts; the AI validates each substance, ranks them by effectiveness, and explains the mechanism
- **AI-Suggest Mode** — Skip the catalysts entirely; the AI identifies the reaction type and recommends the 2–4 best catalysts automatically
- **GIGO Principle** — Vague inputs give qualitative results (Fast/Slow). Add concentration, volume, and catalyst mass to unlock quantitative predictions with units
- **Detailed Reaction Analysis** — Every prediction includes the balanced primary equation, side reactions, byproducts with hazard notes, thermodynamics (ΔH), and a mechanism summary
- **5-Tier Safety System** — Every prediction is rated `SAFE` → `CAUTION` → `RESTRICTED` → `DANGER` → `DO_NOT_PERFORM` with specific precautions
- **Catalyst Finder** — Describe a reaction in plain English and get ranked catalyst suggestions with conditions and availability
- **Experiment History** — All predictions are saved locally in the browser; view, expand, and delete past results from the History tab
- **Fallback API Key** — Automatically retries with a secondary OpenRouter key on rate-limit or timeout errors

---

## Tech Stack

### Backend
| | |
|---|---|
| **Runtime** | Python 3.10+ |
| **Framework** | FastAPI 0.111 |
| **AI** | OpenRouter API → Google Gemini 2.0 Flash |
| **HTTP Client** | httpx (async) |
| **Validation** | Pydantic v2 |
| **Storage** | Local JSON (default) · Supabase (optional) |

### Frontend
| | |
|---|---|
| **Framework** | React 18 + Vite 5 |
| **Styling** | Tailwind CSS v3 |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **HTTP** | Axios |

---

## Project Structure

```
Catalyst Predictor/
├── backend/
│   ├── main.py                    # FastAPI entry point + CORS config
│   ├── requirements.txt
│   ├── .env.example               # Copy → .env and fill in your keys
│   ├── data/
│   │   └── experimental_store.json  # Runtime data (gitignored)
│   ├── models/
│   │   ├── request_models.py      # Pydantic input validation
│   │   └── response_models.py     # Pydantic output schemas
│   ├── routes/
│   │   ├── predict.py             # POST /api/predict
│   │   ├── validate.py            # POST /api/validate-result
│   │   ├── finder.py              # POST /api/find-catalyst
│   │   └── health.py              # GET  /api/health
│   └── services/
│       ├── openrouter.py          # Async AI client with fallback key
│       ├── prompt_builder.py      # System + user prompt construction
│       ├── response_parser.py     # AI JSON → Pydantic models
│       ├── safety_classifier.py   # Safety level logic
│       └── supabase_client.py     # Optional Supabase persistence
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── .env.example
    └── src/
        ├── App.jsx                # Root layout + tab routing
        ├── api/catalystApi.js     # Axios API client
        ├── components/
        │   ├── PredictionForm.jsx # Main input form
        │   ├── ResultsPanel.jsx   # Full results display
        │   ├── TopNav.jsx         # Top navigation bar
        │   ├── Sidebar.jsx        # Left navigation panel
        │   ├── TagInput.jsx       # Multi-tag input (double-space or Enter)
        │   ├── CatalystChart.jsx  # Efficiency bar chart
        │   ├── ComparisonTable.jsx# Catalyst comparison grid
        │   ├── SafetyBanner.jsx   # Safety level banner
        │   └── ExperimentLogger.jsx
        ├── pages/
        │   ├── CatalystFinderPage.jsx
        │   ├── HistoryPage.jsx    # Past predictions from localStorage
        │   └── ComingSoonPage.jsx
        ├── hooks/
        │   └── usePrediction.js   # Prediction state + auto-save to history
        ├── context/
        │   └── SafetyContext.jsx  # Global safety level state
        └── utils/
            ├── historyStorage.js  # localStorage history (save/load/delete)
            └── safetyConfig.js
```

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- An [OpenRouter](https://openrouter.ai) API key (free tier works)

---

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/catalyst-predictor.git
cd catalyst-predictor
```

---

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Open `backend/.env` and fill in your keys:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_API_KEY_2=sk-or-v1-...   # optional fallback
MODEL_ID=google/gemini-2.0-flash-001

# Leave blank to use local JSON storage
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Start the API server:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

The default `frontend/.env` points to the local backend — no changes needed for local development:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

### Start the whole app

On Windows, you can start both the backend and frontend from the project root:

```powershell
.\start-app.ps1
```

Or use the batch wrapper:

```bat
start-app.bat
```

To install dependencies first, run:

```powershell
.\start-app.ps1 -Install
```

The script starts the API at `http://localhost:8000` and the frontend at `http://localhost:5173`.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Backend status check |
| `POST` | `/api/predict` | Full catalyst prediction |
| `POST` | `/api/find-catalyst` | Catalyst finder from description |
| `POST` | `/api/validate-result` | Compare prediction to lab result |

### Example: `/api/predict`

```json
{
  "reaction_type": "Decomposition",
  "reactants": ["Hydrogen Peroxide"],
  "catalysts": ["MnO2", "KI"],
  "temperature_celsius": 25,
  "pressure_atm": 1.0,
  "solvent": "Water",
  "concentration": 0.1,
  "volume_ml": 50,
  "catalyst_mass_g": 0.5
}
```

Leave `catalysts` as an empty array `[]` to activate AI-suggest mode.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Primary OpenRouter API key |
| `OPENROUTER_API_KEY_2` | No | Fallback key on rate-limit/timeout |
| `MODEL_ID` | No | OpenRouter model (default: `google/gemini-2.0-flash-001`) |
| `SUPABASE_URL` | No | Supabase project URL — omit to use local JSON |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API base URL |

---

## Deploying to Vercel

This repo is configured for Vercel from the project root:

- `vercel.json` installs and builds the Vite app in `frontend/`
- static output is served from `frontend/dist`
- Python serverless functions are served from `api/`
- `/api/*` requests stay on the serverless API, and all other routes fall back to the React app

Add these environment variables in Vercel Project Settings:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_API_KEY_2=sk-or-v1-...   # optional
MODEL_ID=google/gemini-2.0-flash-001
APP_URL=https://your-vercel-domain.vercel.app

# Optional, but recommended for persistent experiment validation on Vercel
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

The frontend defaults to `VITE_API_BASE_URL=/api`, so you do not need to set it on Vercel unless the API is hosted elsewhere.

---

## Security Notes

- `backend/.env` and `frontend/.env` are listed in `.gitignore` and will **never** be committed
- Use `.env.example` files as templates — they contain no real credentials
- Rotate your OpenRouter key immediately if it is ever exposed in a log, message, or public location
- The `backend/data/experimental_store.json` runtime file is also gitignored

---

## License

MIT — free to use, modify, and distribute.
