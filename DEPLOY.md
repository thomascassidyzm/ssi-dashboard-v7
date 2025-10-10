# Deployment Guide - SSi Dashboard v7.0 Clean Build

## Step 1: Create New GitHub Repository

1. Go to https://github.com/new
2. Repository name: `ssi-dashboard-v7`
3. Description: "SSi Course Production Dashboard v7.0 - Clean Build"
4. **Private** or Public (your choice)
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

## Step 2: Push to GitHub

Copy the commands from the GitHub page, or use these:

```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean

git remote add origin git@github.com:thomascassidyzm/ssi-dashboard-v7.git
# OR if using HTTPS:
# git remote add origin https://github.com/thomascassidyzm/ssi-dashboard-v7.git

git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import Git Repository
3. Select `thomascassidyzm/ssi-dashboard-v7`
4. **Framework Preset:** Vite
5. **Root Directory:** `.` (default)
6. **Build Command:** `npm run build` (should auto-detect)
7. **Output Directory:** `dist` (should auto-detect)
8. Click "Deploy"

### Option B: Via CLI

```bash
npm install -g vercel
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
vercel --prod
```

## Step 4: Verify Deployment

Once deployed, you should see:

✅ Clean, beautiful UI with emerald green accents
✅ All 8 phases listed (0, 1, 2, 3, 3.5, 4, 5, 6)
✅ No legacy training links
✅ No garish purple gradients
✅ No flickering animations
✅ Professional, subtle design

## What's Different from Old Dashboard

| Old (v6.x branch) | New (Clean v7.0) |
|-------------------|------------------|
| 8 phases (1-8) | 8 phases (0, 1, 2, 3, 3.5, 4, 5, 6) |
| DEBUT/ETERNAL phrases | Pattern-aware baskets |
| FD Testing | Pedagogical translation |
| Python corpus analysis | Corpus intelligence |
| Assembly phase | (merged into compilation) |
| Audio generation phase | (background worker) |
| Legacy component baggage | Zero legacy code |
| Hybrid routing mess | Single clean page |
| Garish purple/cyan | Subtle emerald/slate |
| Flickering animations | Simple hover effects |

## Next Steps (Optional)

If you want to add more pages later:

1. Install Vue Router: `npm install vue-router@4`
2. Create routes for each phase
3. Add individual phase training pages
4. But keep it clean - no legacy!

---

**Ready to deploy!** 🚀

Location: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean`
Status: ✅ Production ready
