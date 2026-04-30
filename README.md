# Catalyst Effect Predictor

An AI-assisted web application for comparing catalysts for chemical reactions. The app accepts reactants, reaction conditions, and optional catalyst candidates, then uses OpenRouter to generate a structured reaction analysis with ranked catalyst recommendations, safety guidance, and experiment-validation support.

The project contains:

- A local FastAPI backend in `backend/`
- Vercel Python serverless functions in `api/`
- A React/Vite frontend in `frontend/`

> Safety note: model output is advisory and can be wrong or incomplete. Do not use this app as the sole authority for hazardous chemistry, lab procedures, or regulatory decisions.

## Features

- Catalyst prediction from reactants, reaction type, catalyst candidates, temperature, pressure, solvent, and optional quantitative fields
- AI-suggest mode when the catalyst list is empty
- Structured reaction analysis with primary equation, side reactions, byproducts, thermodynamic notes, mechanism summary, assumptions, and uncertainty notes
- Five-level safety classification: `SAFE`, `CAUTION`, `RESTRICTED`, `DANGER`, and `DO_NOT_PERFORM`
- Catalyst Finder page for natural-language catalyst suggestions
- Browser-local prediction history through `localStorage`
- Experiment validation endpoint that compares a measured completion time with the AI-predicted rate bucket
- Optional Supabase persistence for predictions and experimental results
- Optional fallback OpenRouter API key for rate-limit, timeout, and service-error retries

## Tech Stack

### Backend

| Area | Technology |
|---|---|
| Local API | FastAPI 0.111 + Uvicorn |
| Serverless API | Flask 2.3 wrappers in `api/` |
| AI provider | OpenRouter chat completions |
| Default model | `google/gemini-2.0-flash-001` |
| HTTP client | httpx |
| Validation | Pydantic v2 |
| Optional storage | Supabase |
| Local fallback storage | JSON file in `backend/data/experimental_store.json` |

### Frontend

| Area | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Charts | Recharts |
| HTTP client | Axios |

## Project Structure

```text
Catalyst Predictor/
|-- api/                         # Vercel serverless Flask functions
|   |-- find_catalyst.py
|   |-- health.py
|   |-- predict.py
|   `-- validate.py
|-- backend/
|   |-- main.py                  # FastAPI app for local development
|   |-- requirements.txt
|   |-- .env.example
|   |-- data/
|   |   `-- experimental_store.json  # Runtime data, gitignored
|   |-- models/
|   |   |-- request_models.py
|   |   `-- response_models.py
|   |-- routes/
|   |   |-- finder.py             # POST /api/find-catalyst
|   |   |-- health.py             # GET  /api/health
|   |   |-- predict.py            # POST /api/predict
|   |   `-- validate.py           # POST /api/validate
|   `-- services/
|       |-- chemistry_postprocessor.py
|       |-- openrouter.py
|       |-- prompt_builder.py
|       |-- response_parser.py
|       |-- safety_classifier.py
|       `-- supabase_client.py
|-- frontend/
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js            # Includes /api proxy to localhost:8000
|   |-- tailwind.config.js
|   |-- .env.example
|   `-- src/
|       |-- App.jsx
|       |-- api/catalystApi.js
|       |-- components/
|       |-- context/
|       |-- hooks/
|       |-- pages/
|       |-- styles/
|       `-- utils/
|-- scripts/
|   `-- test_serverless.py
|-- requirements.txt             # Dependencies for Vercel serverless functions
|-- start-app.ps1                # Starts backend and frontend on Windows
|-- start-app.bat
`-- vercel.json
```

## Prerequisites

- Python 3.10 or newer. The repo's `.python-version` is `3.12`.
- Node.js 18 or newer
- An OpenRouter API key

## Local Development

### 1. Backend setup

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_API_KEY_2=sk-or-v1-...   # optional fallback
MODEL_ID=google/gemini-2.0-flash-001

# Optional. Leave blank or use placeholder values to use local JSON fallback storage.
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Start the local API:

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The local API is available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

### 2. Frontend setup

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:5173`.

`frontend/.env.example` uses:

```env
VITE_API_BASE_URL=/api
```

That works locally because `frontend/vite.config.js` proxies `/api` to `http://localhost:8000`. You can also set `VITE_API_BASE_URL=http://localhost:8000/api` if you want the browser to call the backend directly.

### 3. Start both apps on Windows

From the project root:

```powershell
.\start-app.ps1
```

Install dependencies first and then start both apps:

```powershell
.\start-app.ps1 -Install
```

The script starts:

- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Frontend: `http://localhost:5173`

The batch wrapper runs the same PowerShell script:

```bat
start-app.bat
```

## API Endpoints

The local FastAPI app exposes routes with and without the `/api` prefix. The frontend uses the `/api` versions.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status and configured model |
| `POST` | `/api/predict` | Full catalyst prediction |
| `POST` | `/api/find-catalyst` | Catalyst suggestions from a plain-language reaction description |
| `POST` | `/api/validate` | Compare an experimental result with a stored prediction |

### Example: `POST /api/predict`

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

Leave `catalysts` as an empty array to request AI-suggested catalysts:

```json
{
  "reaction_type": "Decomposition",
  "reactants": ["Hydrogen Peroxide"],
  "catalysts": [],
  "temperature_celsius": 25
}
```

### Example: `POST /api/find-catalyst`

```json
{
  "description": "Find a catalyst for decomposing hydrogen peroxide in a school lab",
  "reaction_type": "Decomposition",
  "temperature_celsius": 25,
  "context": "Use commonly available, lower-risk materials"
}
```

### Example: `POST /api/validate`

```json
{
  "prediction_id": "prediction-id-from-api-predict",
  "catalyst": "MnO2",
  "time_to_completion_seconds": 42,
  "observation_notes": "Visible bubbling slowed after the first minute"
}
```

## Environment Variables

### Backend: `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Primary OpenRouter API key |
| `OPENROUTER_API_KEY_2` | No | Fallback key used for retryable OpenRouter failures |
| `MODEL_ID` | No | OpenRouter model ID. Defaults to `google/gemini-2.0-flash-001` in the OpenRouter client |
| `APP_URL` | No | Referer URL sent to OpenRouter. Defaults to Vercel URL or `http://localhost:5173` |
| `SUPABASE_URL` | No | Supabase project URL. Leave blank or as the placeholder to use local JSON fallback |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key |

### Frontend: `frontend/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | No | API base URL. Defaults to `/api` in the frontend client |

## Deployment Notes

`vercel.json` is configured with Vercel experimental services:

- `frontend/` is built as a Vite app and served at `/`
- `backend/main.py` is configured as a FastAPI service mounted at `/api`
- The repo also contains `api/*.py` Flask serverless functions and a root `requirements.txt` for that serverless layout

Set these environment variables in Vercel:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_API_KEY_2=sk-or-v1-...   # optional
MODEL_ID=google/gemini-2.0-flash-001
APP_URL=https://your-vercel-domain.vercel.app

# Optional, recommended if you need persistence beyond temporary/serverless storage.
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

The frontend defaults to `VITE_API_BASE_URL=/api`, so you only need to override it if the API is hosted somewhere else.

## Persistence

Predictions are saved to Supabase only when both `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured with non-placeholder values.

Without Supabase:

- The local FastAPI validation flow uses `backend/data/experimental_store.json`
- The Vercel Flask validation function uses `/tmp/experimental_store.json` when `VERCEL` is set
- Browser history is still saved in the user's browser through `localStorage`

The SQL schema needed for Supabase is documented in `backend/services/supabase_client.py`.

## Development Checks

Build the frontend:

```powershell
cd frontend
npm run build
```

Run the serverless smoke-test script:

```powershell
python scripts/test_serverless.py
```

## Security Notes

- `.env`, `.env.local`, and other local environment files are gitignored
- `backend/.env.example` and `frontend/.env.example` are templates only
- `backend/data/experimental_store.json` is gitignored because it is runtime data
- Rotate any OpenRouter key immediately if it is exposed in logs, screenshots, chat messages, or a public repository

## License

No license file is currently included in this repository.
