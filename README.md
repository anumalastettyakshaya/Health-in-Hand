# H∞H — Health in Hand

## Project structure
- `client/` — static HTML/CSS/JavaScript frontend (deploy this folder to Netlify).
- `server/` — Express API, MongoDB models, authentication, consent, record upload and family-profile routes.
- `render.yaml` — Render web-service blueprint for deploying the API.

## Important: Netlify hosts only the frontend
The Netlify site is not the Express API and does not run MongoDB. The frontend and backend must use one shared, internet-reachable MongoDB database. A local MongoDB address such as `127.0.0.1` works only on the computer running it.

## Deploy the backend (one-time setup)
1. Create a MongoDB Atlas database and obtain its connection URI. In Atlas, create a database user and allow network access for your hosting provider. Keep the URI private.
2. Push this project to the GitHub repository.
3. In Render, create a new **Blueprint** from that GitHub repository and approve the `render.yaml` service. Alternatively, create a Web Service with root directory `server`, build command `npm install`, and start command `npm start`.
4. In the backend service's environment settings, set:
   - `MONGODB_URI` — your Atlas connection URI (include the database name, e.g. `health_in_hand`).
   - `JWT_SECRET` — a long random secret (at least 32 characters).
   - `CLIENT_ORIGIN` — the exact Netlify origin, e.g. `https://heath-in-hand.netlify.app` (no trailing slash).
   - `NODE_ENV` — `production`.
5. Deploy. Open `https://YOUR-BACKEND.onrender.com/api/health`. It should return JSON with status `ok`.
6. Edit `client/js/config.js` and set `window.HIH_API_BASE` to the backend URL ending in `/api`, for example `https://YOUR-BACKEND.onrender.com/api`. Commit and push. Netlify should redeploy the frontend.

Do not put MongoDB credentials or JWT secrets in `client/`, `config.js`, or any frontend file. Only the public backend URL belongs in `client/js/config.js`.

## Run locally
1. Install Node.js LTS and MongoDB.
2. In `server/`, run `npm install`.
3. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters.
4. Run `npm run dev` in `server/`.
5. Open `client/index.html` with VS Code Live Server. Local frontend development uses `http://localhost:5000/api`.

## Consent and QR flow
- Patient creates a time-limited access token; only its SHA-256 hash is stored in MongoDB.
- The first doctor account to verify a token is bound to that consent. A different doctor cannot reuse it.
- The doctor must use the same account for verification and shared-record access.
- Expiry and revocation are checked by the backend on each shared-record request.
- Patient and doctor devices must connect to the same deployed API and database.

## Safety and prototype limitations
This is a student prototype, not a production medical-record system. Use dummy data only. Doctor credential checks, production-grade file storage, malware scanning, backup/restore, security review, and compliance work are still required. Uploaded files currently use local disk storage on the backend host; ephemeral hosting filesystems may not persist uploads across redeploys. The MongoDB database stores record metadata, not the uploaded file bytes. Use managed object storage before real-world use.

## Troubleshooting
- `Cannot reach backend`: check the backend service is running and `client/js/config.js` contains its public HTTPS URL ending in `/api`.
- CORS error: make `CLIENT_ORIGIN` exactly match `https://heath-in-hand.netlify.app` and redeploy/restart the API.
- Data missing on a second device: both devices must use the same backend URL and the same Atlas database.
- `/api/health` returning `ok` confirms the API is running; it does not by itself prove the database has the correct data.

Never commit `.env`, database credentials, JWT secrets, or real patient records. Use dummy data for demos.
