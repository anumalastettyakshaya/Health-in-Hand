# H∞H — Health in Hand

## Project structure
- `client/` — responsive website (HTML, CSS, JavaScript)
- `server/` — Express API, MongoDB models, authentication, consent, record upload and family-profile routes

## Run the backend
1. Install Node.js LTS and MongoDB.
2. Open a terminal in `server/`.
3. Run `npm install`.
4. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
5. Run `npm start`. The API defaults to `http://localhost:5000`.

## Run the website
Open `client/index.html` using VS Code Live Server. The API base defaults to `http://localhost:5000/api`. The backend must be running for login, records, uploads, consent, and family profiles.

## Current behavior
- Purple/violet visual theme, light/dark mode, and responsive hamburger navigation.
- Medical record upload with PDF/JPG/PNG attachment, protected file opening, edit/delete for the record creator, and backend ownership checks.
- Time-limited QR sharing; the raw token is not shown as a separate string. The QR/share link references the token. Doctors must sign in to verify access.
- Family profile creation, selection, and deletion. Medical records are scoped to the selected family profile.

## Important limitations
This is a development prototype, not a production medical-record system. Family profiles can be managed under the account, but converting a dependent profile into a fully independent login account is not implemented yet. Doctor credential checks, deployment hardening, audit review, backups, malware scanning, and production-grade file storage are also not implemented. Use dummy data until security and privacy requirements are reviewed.

## Cross-device setup and testing

- Start MongoDB and set `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN` in `server/.env`.
- Run `npm install` once in `server/`, then `npm run dev`.
- Serve `client/index.html` using Live Server.
- For two devices on the same Wi-Fi, open the frontend using the development computer's LAN IP (not `localhost`) and ensure port 5000 is reachable through the firewall. The API client uses the current hostname with port 5000 by default for LAN testing.
- If the frontend and backend are hosted on different domains, set the frontend API base in the browser console before reloading: `localStorage.setItem('hih_api_base', 'https://YOUR-BACKEND-DOMAIN/api')`. Set `CLIENT_ORIGIN` to the exact deployed frontend origin and restart the backend.
- The QR code contains the raw access token. If the QR scanner displays the token as text, copy it and paste it into the doctor's **Get token** page. The **Copy Access Token** button copies the same token.
- Use dummy data only. Tokens expire and can be revoked; clearing a history list in the UI does not delete the backend audit trail.

## Notes on the current prototype

- Doctor access history is stored by the backend for shared-record views and doctor record actions. The logbook offers day/week/month/year/all filters.
- Family profile records are separated using `familyProfileId`; family profile contact details no longer fall back to the main account's email/phone when blank.
- Static HTML frontend changes and backend syntax have been checked, but this archive has not been end-to-end tested against a live MongoDB instance or a deployed multi-device environment. Configure the deployment API URL and CORS origin before publishing.


## Accessing a patient token from another computer

Patient and doctor devices must connect to the **same reachable backend and MongoDB database**. A frontend opened on each laptop with `localhost` points to that laptop, not the other device. For a local-network demo, run the backend on one computer, bind it to the network interface, allow port 5000 through the host firewall, and set the frontend API base in the browser before using the app:

```js
localStorage.setItem("hih_api_base", "http://YOUR-SERVER-LAN-IP:5000/api");
location.reload();
```

Replace `YOUR-SERVER-LAN-IP` with the backend computer's LAN IP. For use over the internet, deploy the backend with HTTPS and a shared MongoDB database, then set `hih_api_base` to that deployed API URL on both devices. Do not use `localhost` as the API host on the doctor's laptop unless the backend is running on that same laptop. Access tokens are time-limited and can be revoked by the patient.
