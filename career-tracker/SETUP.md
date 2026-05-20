# Career Tracker — Setup Guide
Follow these steps exactly. Takes about 20 minutes total.

---

## STEP 1 — Create Firebase project (free)

1. Go to console.firebase.google.com
2. Click "Add project" → name it "career-tracker" → click Continue
3. Disable Google Analytics (not needed) → Create project
4. Click "Web" icon (</>) to add a web app
5. Name it "career-tracker" → click Register app
6. COPY the firebaseConfig object shown — you will need it in Step 3
7. Click Continue to console

## STEP 2 — Enable Google login in Firebase

1. In Firebase console → left menu → Build → Authentication
2. Click "Get started"
3. Click "Google" under Sign-in providers
4. Toggle Enable → add your email as support email → Save

## STEP 3 — Enable Firestore database in Firebase

1. In Firebase console → left menu → Build → Firestore Database
2. Click "Create database"
3. Choose "Start in production mode" → Next
4. Choose any location → Enable
5. Go to Rules tab → replace the rule with this:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

6. Click Publish

## STEP 4 — Add your Firebase config to the code

1. Open the file: src/firebase.js
2. Replace the firebaseConfig object with the one you copied in Step 1
3. Save the file

## STEP 5 — Deploy to Vercel (free hosting)

1. Create free account at github.com (if you don't have one)
2. Create free account at vercel.com → login with GitHub
3. Install Vercel CLI: open terminal → run:
   npm install -g vercel
4. In terminal, go to this project folder:
   cd career-tracker
5. Run:
   npm install
   npm run build
   vercel
6. Follow the prompts — say Yes to everything
7. Vercel gives you a link like: https://career-tracker-abc.vercel.app
   THIS IS YOUR PERSONAL LINK — bookmark it

## STEP 6 — Add your domain to Firebase (important)

1. In Firebase console → Authentication → Settings → Authorized domains
2. Click Add domain
3. Add your Vercel URL (without https://) example: career-tracker-abc.vercel.app
4. Save

## DONE

Open your Vercel link on any device.
Sign in with Google.
Your progress syncs automatically across all devices.

---

To update the app in future:
- Edit the code
- Run: npm run build → vercel --prod
