# H∞H — Health in Hand | Frontend

A responsive HTML/CSS/JavaScript frontend connected to the Node.js/Express/MongoDB backend supplied with the project.

## Included
- Landing page, login and registration (patient/doctor roles)
- Patient dashboard with API-backed profile, counts, recent records and access activity
- Record timeline and multipart report upload (PDF/JPG/PNG, backend limit 5 MB)
- Patient consent creation, QR generation, token display/copy, access-grant list and revoke action
- Doctor dashboard, token verification, authorized shared records, and doctor-created record form
- Shared API helper with JWT Bearer auth and role-aware navigation
- Responsive layouts for desktop and mobile

## Run it
1. Extract this folder beside your existing `server` folder, or copy `client` into your project root.
2. Start the backend in `server`:
   ```bash
   npm install
   npm run dev
   ```
   Ensure MongoDB is running and `server/.env` has `PORT`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN`.
3. Serve the frontend using VS Code Live Server (recommended) on `http://127.0.0.1:5500`, or any static HTTP server. Do not open `index.html` as a `file://` URL.
4. The default API base is `http://localhost:5000/api`. If needed, run this in the browser console before refreshing:
   ```js
   localStorage.setItem("hih_api_base", "http://localhost:5000/api")
   ```
5. Set backend `CLIENT_ORIGIN` to the exact frontend origin (e.g. `http://127.0.0.1:5500`) and restart the backend.

## Important integration notes
This frontend uses the actual routes in the supplied backend:
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/patients/me`, `GET /api/patients/summary`
- `GET /api/doctors/me`
- `GET /api/records`, `POST /api/records`, `GET /api/records/shared`
- `POST /api/consents`, `GET /api/consents`, `DELETE /api/consents/:id`, `GET /api/consents/verify/:token`

The supplied backend currently does not implement family profiles, a dedicated access-log endpoint, protected report downloads/previews, camera-based QR scanning, doctor-outcome tracking/reviews, or actual medical registration verification. The frontend does not pretend those features are implemented. For this backend, doctors enter/paste the token encoded in the patient's QR; the backend checks consent on the protected requests. QR rendering loads QRCode.js from a CDN, so internet access is needed for that part.

## Security / prototype warning
Use dummy data only. This is an MVP, not production-ready medical software. JWTs are held in localStorage for prototype convenience; review token storage, HTTPS, CSRF/XSS protections, file-signature validation, malware scanning, audit controls and privacy requirements before real patient use.
