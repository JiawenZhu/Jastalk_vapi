# Routing Structure Documentation

## Overview

The application has been refactored from a single-page application (SPA) with conditional rendering to a **multi-page application with React Router**. Each menu item now has its own route and dedicated page component.

---

## Architecture Change

### Before (Single Page):
```
InterviewAgentUI (One Component)
├── if (activeMenu === 'interviews') → Show Mock Interviews
├── if (activeMenu === 'custom') → Show Custom Interviews
├── if (activeMenu === 'results') → Show Results
└── if (activeMenu === 'billing') → Show Billing
```

### After (Multi-Page with Routes):
```
App (Router Container)
├── Layout (Sidebar + Navigation)
└── Routes
    ├── / → MockInterviews Page
    ├── /custom → CustomInterviews Page
    ├── /results → Results Page
    └── /billing → Billing Page
```

---

## File Structure

```
/src
├── App.jsx                      # Main app with Router setup
├── index.jsx                    # Entry point (renders <App />)
├── interview_agent_ui.jsx       # Original component (used during active interview)
│
├── /pages                       # Page components
│   ├── MockInterviews.jsx       # Route: /
│   ├── CustomInterviews.jsx     # Route: /custom
│   ├── Results.jsx              # Route: /results
│   └── Billing.jsx              # Route: /billing
│
├── /components
│   ├── Layout.jsx               # Sidebar + Navigation wrapper
│   └── JobCard.jsx              # Job search result card
│
└── /utils
    └── talentSolutionApi.js     # Google Talent Solution API helpers
```

---

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | MockInterviews | Browse and start mock interviews by category |
| `/custom` | CustomInterviews | Job search and custom interview generation |
| `/results` | Results | View interview history and performance metrics |
| `/billing` | Billing | Manage subscription and payment settings |
| `*` (fallback) | Redirect to `/` | Any unknown route redirects to home |

---

## Component Responsibilities

### **App.jsx**
- Main application container
- Router configuration
- Global state management (templates, job search, interviews)
- Provides state and handlers to page components via props
- Handles transition between navigation mode and interview mode

### **Layout.jsx**
- Persistent sidebar navigation
- Language selector
- Active route highlighting
- Responsive sidebar collapse/expand
- Wraps all page content

### **Page Components** (`/pages/*`)
- Pure presentational components
- Receive data and handlers via props
- No direct state management (except local UI state)
- Focused on specific functionality

---

## Navigation Flow

### 1. User clicks "Mock Interviews" in sidebar
```
Click → React Router → Navigate to "/" → Render <MockInterviews />
```

### 2. User clicks a category
```
setSelectedCategory(category) → MockInterviews re-renders with category view
```

### 3. User starts an interview
```
setActiveInterview(interview) → App detects active interview →
Shows <InterviewAgentUI /> instead of router
```

### 4. User exits interview
```
onExit() → setActiveInterview(null) → App shows router again →
User back to previous page
```

---

## State Management

### Global State (in App.jsx):
```javascript
// Language & UI
- currentLang
- showLanguageMenu
- sidebarCollapsed

// Templates & Categories
- interviewTemplates
- interviewCategories (computed)

// Interview State
- selectedCategory
- activeInterview
- currentQuestionIndex
- userAnswers

// Job Search
- jobSearchQuery
- jobSearchLocation
- searchResults
- isSearching
- searchError
- generatingJobId
- applyingJobId
- customInterviews
```

### Local State (in Page Components):
- Minimal UI state only (e.g., dropdown open/closed)
- All data comes from App via props

---

## Props Flow

### MockInterviews Page:
```javascript
<MockInterviews
  t={translations}
  currentLang={currentLang}
  interviewCategories={interviewCategories}
  selectedCategory={selectedCategory}
  setSelectedCategory={setSelectedCategory}
  setActiveInterview={setActiveInterview}
  setCurrentQuestionIndex={setCurrentQuestionIndex}
  setUserAnswers={setUserAnswers}
/>
```

### CustomInterviews Page:
```javascript
<CustomInterviews
  t={translations}
  jobSearchQuery={jobSearchQuery}
  setJobSearchQuery={setJobSearchQuery}
  // ... (see App.jsx for full list)
/>
```

---

## How to Add a New Page

### Step 1: Create Page Component
```javascript
// src/pages/NewPage.jsx
import React from 'react';

const NewPage = ({ t, ...props }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-2">New Page</h1>
        {/* Your content here */}
      </div>
    </div>
  );
};

export default NewPage;
```

### Step 2: Add Route in App.jsx
```javascript
import NewPage from './pages/NewPage';

// Inside <Routes>
<Route path="/new-page" element={<NewPage t={t} />} />
```

### Step 3: Add Navigation Link in Layout.jsx
```javascript
<Link
  to="/new-page"
  className={`... ${isActive('/new-page') ? 'bg-blue-500 text-white' : '...'}`}
>
  <Icon size={20} />
  {!sidebarCollapsed && <span>{t.newPage}</span>}
</Link>
```

### Step 4: Add Translations
```javascript
// In App.jsx getTranslations()
const translations = {
  en: {
    newPage: "New Page",
    // ...
  },
  zh: {
    newPage: "新页面",
    // ...
  }
};
```

---

## Interview Mode Toggle

The app has **two modes**:

### Navigation Mode (Default):
- Router is active
- Shows sidebar and pages
- User can browse categories, search jobs, view results

### Interview Mode:
- Router is hidden
- Shows `<InterviewAgentUI />` component
- Full-screen interview experience
- Exit button returns to Navigation Mode

```javascript
// In App.jsx
if (activeInterview) {
  return (
    <InterviewAgentUI
      preselectedInterview={activeInterview}
      onExit={() => {
        setActiveInterview(null);
        // Returns to previous page
      }}
    />
  );
}

return (
  <Router>
    {/* Normal navigation */}
  </Router>
);
```

---

## URL Structure

| URL | Page | Description |
|-----|------|-------------|
| `http://localhost:3002/` | Mock Interviews | Home page |
| `http://localhost:3002/custom` | Custom Interviews | Job search + interview generation |
| `http://localhost:3002/results` | Results | Performance tracking |
| `http://localhost:3002/billing` | Billing | Subscription management |
| `http://localhost:3002/anything-else` | Redirect to `/` | 404 handling |

---

## Benefits of This Architecture

### ✅ Better Organization
- Each page is a separate file
- Easier to find and maintain code
- Clear separation of concerns

### ✅ Improved Navigation
- Real URL changes
- Browser back/forward buttons work
- Shareable URLs for specific pages

### ✅ Better Performance
- Only active page is rendered
- Lazy loading potential for future optimization
- Reduced component tree complexity

### ✅ Easier Development
- Add new pages without touching existing code
- Test pages in isolation
- Clear props interfaces

### ✅ Better UX
- Native browser navigation
- Bookmarkable pages
- SEO-friendly (if SSR added later)

---

## Migration Notes

### What Changed:
1. ✅ Installed `react-router-dom`
2. ✅ Created `/pages` directory with page components
3. ✅ Created `Layout.jsx` component
4. ✅ Created `App.jsx` with router configuration
5. ✅ Updated `index.jsx` to render `<App />`
6. ✅ Kept original `InterviewAgentUI.jsx` for interview mode

### What Stayed the Same:
- ✅ All existing functionality preserved
- ✅ Interview experience unchanged
- ✅ Vapi/Pipecat integration intact
- ✅ Job search feature works as before
- ✅ Styling and UI identical

---

## Testing the Routes

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Test each route**:
   - Visit `http://localhost:3002/` → Should show Mock Interviews
   - Visit `http://localhost:3002/custom` → Should show Custom Interviews
   - Visit `http://localhost:3002/results` → Should show Results
   - Visit `http://localhost:3002/billing` → Should show Billing

3. **Test navigation**:
   - Click sidebar links → URL should change
   - Use browser back/forward → Should navigate correctly
   - Refresh page → Should stay on same route

4. **Test interview mode**:
   - Start an interview → Should hide sidebar and router
   - Exit interview → Should return to previous page

---

## Future Enhancements

### Potential Improvements:
1. **Lazy Loading**:
   ```javascript
   const MockInterviews = lazy(() => import('./pages/MockInterviews'));
   ```

2. **Protected Routes**:
   ```javascript
   <Route element={<ProtectedRoute />}>
     <Route path="/billing" element={<Billing />} />
   </Route>
   ```

3. **Route Transitions**:
   ```javascript
   import { AnimatePresence } from 'framer-motion';
   ```

4. **Nested Routes**:
   ```javascript
   <Route path="/interviews" element={<InterviewsLayout />}>
     <Route path="mock" element={<MockInterviews />} />
     <Route path="custom" element={<CustomInterviews />} />
   </Route>
   ```

5. **Query Parameters**:
   ```javascript
   // /custom?category=software
   const [searchParams] = useSearchParams();
   const category = searchParams.get('category');
   ```

---

## Troubleshooting

### Issue: Blank page after refactor
**Solution**: Check browser console for errors, ensure all imports are correct

### Issue: Sidebar not showing active route
**Solution**: Verify `useLocation()` is being used in `Layout.jsx`

### Issue: Interview mode not exiting properly
**Solution**: Ensure `onExit` callback is calling `setActiveInterview(null)`

### Issue: 404 on refresh
**Solution**: Configure dev server for SPA routing (already set in Vite config)

---

## Summary

The application now uses **React Router** for navigation with:
- ✅ 4 main routes (/, /custom, /results, /billing)
- ✅ Persistent sidebar navigation
- ✅ Seamless interview mode toggle
- ✅ All original features preserved
- ✅ Better code organization
- ✅ Improved user experience

Each menu item is now a separate page with its own URL, making the application more maintainable and user-friendly.

---

*Documentation created: October 25, 2025*
*Routing implementation: React Router DOM v6*
