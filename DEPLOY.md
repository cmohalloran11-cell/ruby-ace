# MLB Pro — Deploy Guide
# Follow these steps exactly. Takes about 45 minutes.

## STEP 1 — Accounts to Create (do these first)
1. github.com — free account
2. vercel.com — sign up with your GitHub
3. supabase.com — free account, create project called "mlb-pro"
4. the-odds-api.com — sign up, get your NEW API key (regenerate if old one was exposed)

---

## STEP 2 — Set Up the Database (Supabase)
1. Go to supabase.com → your mlb-pro project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Open the file: lib/schema.sql
5. Copy everything → paste into SQL editor → click RUN
6. Click "Table Editor" — you should see tables like users, projections, etc.
7. Save these from your Supabase dashboard Settings → API:
   - Project URL (looks like https://abc123.supabase.co)
   - anon/public key
   - service_role key (keep this secret)

---

## STEP 3 — Configure Environment Variables
1. In the mlb-pro folder, copy .env.local.example to .env.local
2. Fill in every value:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=makethisatleast40randomcharacterslong1234567
ODDS_API_KEY=your-new-odds-api-key
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=chooseastrongpassword

---

## STEP 4 — Create Your Admin Account
After filling .env.local, open Terminal in the mlb-pro folder and run:
  node -e "
    const bcrypt = require('bcryptjs');
    bcrypt.hash('YOUR_ADMIN_PASSWORD', 12).then(h => console.log(h));
  "

Then go to Supabase → Table Editor → users → Insert Row:
  email: your@email.com
  username: admin
  password_hash: (the hash from above)
  role: admin

---

## STEP 5 — Test Locally
In Terminal, inside the mlb-pro folder:
  npm install
  npm run dev

Open http://localhost:3000
- You should see the MLB Pro platform with today's games
- Sign in with your admin email/password
- Admin tab appears in the top nav

---

## STEP 6 — Push to GitHub
1. Go to github.com → New Repository → name it "mlb-pro" → Create
2. In Terminal inside mlb-pro folder:
   git init
   git add .
   git commit -m "Initial build"
   git remote add origin https://github.com/YOURUSERNAME/mlb-pro.git
   git push -u origin main

---

## STEP 7 — Deploy to Vercel
1. Go to vercel.com → New Project
2. Import your mlb-pro GitHub repository
3. Framework: Next.js (auto-detected)
4. Add ALL your environment variables from .env.local:
   - Click "Environment Variables"
   - Add each one: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
     SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, ODDS_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
5. Click Deploy
6. Wait ~2 minutes
7. Your site is live at something like mlb-pro.vercel.app

---

## STEP 8 — Upload Your First Projections
1. Go to your live site → sign in as admin → click Admin tab
2. Click "⬆ Upload CSV"
3. Upload a CSV from FantasyPros or theBatX
4. CSV must have columns: Name, Team, Pos, DK Salary, Proj, Own%, HR, RBI, R, SB, K, IP, ER, BB

---

## STEP 9 — ESPN Fantasy Sync (optional)
1. Sign in → click your username → Settings
2. Enter your ESPN League ID (from the URL when you're on your ESPN league page)
3. For private leagues: open ESPN in Chrome → F12 → Application → Cookies → fantasy.espn.com
   Copy espn_s2 and SWID values → paste into the form
4. Click Sync

---

## HOW UPDATES WORK
After deployment, every time you change code:
  git add .
  git commit -m "describe your change"
  git push

Vercel automatically deploys within 30 seconds. No manual steps.

---

## WHAT'S FREE AND WHAT'S NOT
- Vercel hosting: FREE
- Supabase database: FREE (500MB, plenty)
- MLB Stats API (schedule, scores, stats): FREE forever, no key
- Open-Meteo weather: FREE forever, no key
- The Odds API prop lines: FREE (500 req/month)
- ESPN Fantasy sync: FREE (uses their public API)
- MLB + team RSS news feeds: FREE forever

TOTAL MONTHLY COST: $0
