# 🚀 Quick Start: Job Search Feature

## 5-Minute Setup Guide

### Step 1: Get Google Cloud API Credentials (3 min)

1. Go to: https://console.cloud.google.com/
2. Create new project or select existing one
3. Enable "Cloud Talent Solution API": https://console.cloud.google.com/apis/library/jobs.googleapis.com
4. Create API Key: https://console.cloud.google.com/apis/credentials → "Create Credentials" → "API Key"
5. Copy the API key

### Step 2: Configure Environment (1 min)

```bash
# Copy template
cp .env.example .env

# Edit .env - add these two lines:
VITE_TALENT_API_PROJECT=your-project-id-here
VITE_TALENT_API_KEY=your-api-key-here
```

### Step 3: Test It! (1 min)

```bash
# Start dev server
npm run dev

# Navigate to: http://localhost:3002
# Click: "Custom Interviews" in sidebar
# Search: "Software Engineer"
# Click: "Search" button
```

## ✅ You're Done!

You should now see real job search results. Click:
- **"Generate Interview"** → Creates custom interview questions
- **"Apply"** → Opens job application

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "API key not set" error | Restart dev server after editing `.env` |
| No search results | Try broader terms like "developer" or "engineer" |
| "Permission denied" | Enable billing in Google Cloud Console |
| API errors in console | Check API key is restricted to "Cloud Talent Solution API" only |

---

## 📖 Full Documentation

- Setup Guide: [`JOB_SEARCH_SETUP.md`](./JOB_SEARCH_SETUP.md)
- Implementation Details: [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md)
- Google API Docs: https://cloud.google.com/talent-solution/job-search/docs

---

Happy job hunting! 🎯
