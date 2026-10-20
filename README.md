# CropMate

Farm Smarter. Grow Better. Together.

A farm record app with a Node.js + Express + MongoDB backend and a plain HTML/CSS/JavaScript frontend
(no build step). The backend also serves the frontend, so one command runs everything.

## Folder structure

```
CropMate/
├── docker-compose.yml          optional local MongoDB
├── backend/
│   ├── server.js               starts the server (connects to MongoDB, then listens)
│   ├── app.js                  Express setup: security headers, JSON, routes, static frontend
│   ├── .env.example            copy to .env and fill in
│   ├── config/                 env.js (settings), db.js (MongoDB connection)
│   ├── models/                 one file per MongoDB collection (User, Farm, Crop, Harvest, ...)
│   ├── controllers/            the logic for each route (auth, crud, notes, analytics, ai, ...)
│   ├── routes/                 which URL goes to which controller
│   ├── middleware/             auth (login check), rate limits, error handler
│   ├── services/               Gemini AI, assistant tools, weather, prices, note parser, farm summary, email
│   └── utils/                  AppError, asyncHandler, sanitize
└── frontend/
    ├── index.html              the page shell (loads the scripts in js/ in order)
    ├── manifest.json, sw.js    makes it installable on phones (PWA) and usable offline
    ├── assets/                 logo and app icons (dark, light, black-and-white)
    ├── css/styles.css          all styling, using the CropMate colors
    └── js/
        ├── cm.js               shared namespace (window.CM)
        ├── main.js             start-up
        ├── api.js              every request; picks the server or browser-only mode
        ├── localApi.js         browser-only stand-in for the backend (localStorage)
        ├── state.js, data.js   the loaded data
        ├── router.js           which screen is showing
        ├── components.js       reusable HTML pieces (forms, tables, bars)
        ├── chatWidget.js       the round AI button and chat window
        ├── auth.js, onboarding.js, overlay.js, voice.js
        ├── config.js, recordTypes.js
        └── pages/              one file per screen (home, notes, harvest, analytics, doctor, ...)
```

## Quick look (no setup)

Double-click `frontend/index.html`. The app opens straight away with demo data and works fully in your browser
(farms, crops, harvests, all record screens, notes with voice or text, analytics, predictions, Crop Doctor samples).
Your data is saved in that browser only. Login, cloud backup, AI photo analysis and market prices need the backend below.

## Run the full app (frontend + backend + MongoDB)

1. Install Node.js 18 or newer.
2. Get a MongoDB: a free MongoDB Atlas cluster (copy its connection string), or run `docker compose up -d` in this folder.
3. In the `backend` folder:
   ```
   cp .env.example .env
   ```
   Open `.env` and set `MONGODB_URI`, `JWT_SECRET` (a long random text) and `GEMINI_API_KEY` (for the AI features).
   ```
   npm install
   npm start
   ```
4. Open http://localhost:5000 and create an account.

The app checks for the backend when it starts. If it finds one it uses it (with login); if not, it runs in the
browser-only mode above. The sync label at the top of each screen shows which mode you are in.

Without `GEMINI_API_KEY`, notes are still read with built-in rules and the Assistant answers basic profit and harvest
questions. Crop Doctor photo analysis and Market prices need the key.

## AI Assistant (round button on the right)

A round button with the CropMate logo sits on the right side of every screen. Tap it to open a small chat window.
Use the **⤢** button to make it bigger (full screen on a phone) and **⤡** to make it small again. **🧹** starts a new chat, **✕** or Esc closes it.
"AI Assistant" in the menu opens the same window, big.

Type, or tap **🎤** and speak (English or Tamil). Turn on **Read aloud** to hear the answers, or **Talk mode** for a hands-free
conversation: it answers out loud, then listens to you again.

It can:
- **Research and explain anything:** with the backend and a Gemini key it searches the web and shows its sources.
  Without the server, general questions get a short answer from Wikipedia.
- **Check your data:** "What is my profit?", "Show my last 5 harvests", "How many boxes of tomato this month?"
- **Make changes:** "Add harvest 12 boxes tomato 20kg price 35 per kg", "Change price of last harvest to 40", "Delete last harvest".
  It only prepares the change. A card appears and nothing is saved until you tap **Confirm**.
- **Weather:** "Weather in Madurai" (free Open-Meteo data). With no place given it uses the location saved on your farm.
- **Prices:** live mandi prices when `DATA_GOV_API_KEY` is set (free key from data.gov.in); otherwise web research or a clearly labelled estimate.
- **Plant problems:** likely cause and low-risk steps. It never gives chemical doses. Use Crop Doctor for photos.

With the backend and `GEMINI_API_KEY`, the AI understands natural sentences in English and Tamil and can use all of the above.
Without a server, a simpler built-in version handles the commands, weather, common plant problems and Wikipedia answers.

## Put it online

Deploy the `backend` folder to Render, Railway or any Node host that gives you HTTPS, set the same environment
variables there, and use MongoDB Atlas. Open the link on a phone:
Android Chrome: menu > Install app. iPhone Safari: Share > Add to Home Screen.
For a Play Store package, paste your live link into pwabuilder.com.

## API

All routes except `/api/auth/*` need the header `Authorization: Bearer <token>`.

| Route | Purpose |
|---|---|
| POST /api/auth/signup, /login | Create account, log in (returns a token) |
| POST /api/auth/forgot, /reset | Password reset by emailed link |
| GET, PUT, DELETE /api/auth/me | Profile; delete account and all data |
| GET, POST /api/{resource}  and  GET, PUT, DELETE /api/{resource}/:id | Records. resource = farms, fields, crops, notes, harvests, fertilizers, pesticides, irrigations, labour, expenses, sales, pestrecords, diagnoses. Filters: ?crop= &farm= &field= &from= &to= |
| POST /api/notes/convert | Turn a note into harvest, fertilizer, expense and irrigation records. The note is kept. |
| GET /api/all, /api/export | Everything for the logged-in user |
| GET /api/analytics | Totals, per-crop results, monthly figures, expense categories |
| GET /api/predict?crop= | Next harvest estimate |
| POST /api/ai/chat | AI Assistant: reads your data, weather, prices and the web, and proposes changes for you to confirm |
| POST /api/ai/structure, /doctor, /assistant, /market | Other AI features |

## Security built in

- Passwords are hashed with bcrypt. Logins use signed tokens that expire after 30 days.
- Every database query is limited to the logged-in user, so farmers cannot see each other's data.
- The AI key stays on the server. Rate limits, Helmet security headers, and cleaning of request bodies are on.
- Use a long random `JWT_SECRET`, never share or commit `.env`, and use HTTPS when online.

## Known limits

- The frontend was tested in a real browser, both opened by double-click and against a fake server. The backend was syntax-checked only,
  not run against a live MongoDB, so test signup, saving a harvest and converting a note first.
- Live mandi prices work only if you add a `DATA_GOV_API_KEY`. That connection and the real Gemini chat were not tested here
  (no internet). The assistant's tool logic, including web research, was tested against a fake AI and fake database.
- Pest record photos are not stored. Data refreshes on login and after each save (no live push between devices).
