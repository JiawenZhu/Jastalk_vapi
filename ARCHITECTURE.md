# Job Search Feature Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Custom Interviews Page                       │
│                  (interview_agent_ui.jsx)                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │    Job Search Component           │
        │  ┌─────────────────────────────┐  │
        │  │ Search Form                 │  │
        │  │ - Job Title Input           │  │
        │  │ - Location Input            │  │
        │  │ - Search Button             │  │
        │  └─────────────────────────────┘  │
        └───────────────────────────────────┘
                        │
                        │ handleJobSearch()
                        ▼
        ┌───────────────────────────────────┐
        │   talentSolutionApi.js            │
        │   ┌───────────────────────────┐   │
        │   │ searchJobs()              │   │
        │   │ - Build API request       │   │
        │   │ - Transform response      │   │
        │   │ - Handle errors           │   │
        │   └───────────────────────────┘   │
        └───────────────────────────────────┘
                        │
                        │ HTTP POST
                        ▼
        ┌───────────────────────────────────┐
        │  Google Cloud Talent Solution API │
        │  https://jobs.googleapis.com/v4   │
        │  ┌───────────────────────────┐    │
        │  │ POST /jobs:search         │    │
        │  │ Authorization: API Key    │    │
        │  └───────────────────────────┘    │
        └───────────────────────────────────┘
                        │
                        │ JSON Response
                        ▼
        ┌───────────────────────────────────┐
        │    Search Results Display         │
        │  ┌───────────────────────────┐    │
        │  │ JobCard Component (x N)   │    │
        │  │ ┌─────────────────────┐   │    │
        │  │ │ - Job Title         │   │    │
        │  │ │ - Company           │   │    │
        │  │ │ - Location          │   │    │
        │  │ │ - Description       │   │    │
        │  │ │ - [Generate] Button │   │    │
        │  │ │ - [Apply] Button    │   │    │
        │  │ └─────────────────────┘   │    │
        │  └───────────────────────────┘    │
        └───────────────────────────────────┘
                │                    │
                │                    │
                ▼                    ▼
    ┌──────────────────┐   ┌──────────────────┐
    │ Generate         │   │ Apply            │
    │ Interview        │   │ to Job           │
    └──────────────────┘   └──────────────────┘
                │                    │
                ▼                    ▼
    ┌──────────────────┐   ┌──────────────────┐
    │ generateQuestions│   │ applyToJob()     │
    │ FromJob()        │   │ - Open URL       │
    │ - Parse job desc │   │ - Email link     │
    │ - Create 6-8 Qs  │   │ - Instructions   │
    └──────────────────┘   └──────────────────┘
                │
                ▼
    ┌──────────────────┐
    │ Custom Interview │
    │ Object Created   │
    │ - title          │
    │ - company        │
    │ - questions[]    │
    └──────────────────┘
                │
                ▼
    ┌──────────────────┐
    │ Add to           │
    │ customInterviews │
    │ State Array      │
    └──────────────────┘
                │
                ▼
    ┌──────────────────┐
    │ Display in       │
    │ "Generated       │
    │ Interviews"      │
    │ Section          │
    └──────────────────┘
```

## Data Flow Diagram

```
User Input
    ↓
[ Search Form ]
    ↓
jobSearchQuery: "Software Engineer"
jobSearchLocation: "San Francisco"
    ↓
[ handleJobSearch() ]
    ↓
API Request:
{
  jobQuery: {
    query: "Software Engineer",
    locationFilters: [{
      address: "San Francisco"
    }]
  },
  maxPageSize: 20
}
    ↓
[ Google Talent API ]
    ↓
API Response:
{
  matchingJobs: [
    {
      job: {
        name: "projects/123/jobs/456",
        title: "Senior Software Engineer",
        company: "companies/789",
        description: "...",
        applicationInfo: {
          uris: ["https://..."]
        }
      }
    }
  ]
}
    ↓
[ Transform Response ]
    ↓
Transformed Jobs:
[
  {
    id: "projects/123/jobs/456",
    title: "Senior Software Engineer",
    company: "Tech Co",
    description: "...",
    location: "San Francisco, CA",
    applicationInfo: {...}
  }
]
    ↓
[ setSearchResults() ]
    ↓
[ Render JobCard Components ]
```

## Component Hierarchy

```
InterviewAgentUI
├── Sidebar
│   └── Custom Interviews Button
│
└── Main Content (activeMenu === 'custom')
    ├── Page Header
    │   ├── Title: "Create Custom Interviews"
    │   └── Subtitle
    │
    ├── Job Search Section
    │   ├── Search Form
    │   │   ├── Job Title Input
    │   │   ├── Location Input
    │   │   └── Search Button
    │   │
    │   ├── Error Display (conditional)
    │   └── Results Count (conditional)
    │
    ├── Search Results (conditional)
    │   └── JobCard[] (mapped)
    │       ├── Job Info Display
    │       ├── Generate Interview Button
    │       └── Apply Button
    │
    └── Generated Interviews Section
        ├── Section Header
        └── Interview Cards[] (mapped)
            ├── Interview Info
            └── Start Interview Button
```

## State Management Flow

```
Initial State:
├── jobSearchQuery: ''
├── jobSearchLocation: ''
├── searchResults: []
├── isSearching: false
├── searchError: null
├── generatingJobId: null
├── applyingJobId: null
└── customInterviews: []

After Search:
├── jobSearchQuery: 'Software Engineer'
├── jobSearchLocation: 'San Francisco'
├── searchResults: [Job, Job, Job, ...]
├── isSearching: false
├── searchError: null
├── generatingJobId: null
├── applyingJobId: null
└── customInterviews: []

After Generate Interview:
├── jobSearchQuery: 'Software Engineer'
├── jobSearchLocation: 'San Francisco'
├── searchResults: [Job, Job, Job, ...]
├── isSearching: false
├── searchError: null
├── generatingJobId: null (was 'job-123' during generation)
├── applyingJobId: null
└── customInterviews: [
    {
      id: 'custom-1234567890',
      title: 'Senior Software Engineer',
      company: 'Tech Co',
      questions: [Q1, Q2, Q3, ...],
      difficulty: 'Medium',
      duration_minutes: 30
    }
  ]
```

## API Integration Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. User enters search query and clicks Search       │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 2. handleJobSearch() validates input               │
│    - Checks if query is not empty                  │
│    - Sets isSearching = true                       │
│    - Clears previous errors                        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 3. searchJobs() API call                           │
│    - Builds request body                           │
│    - Adds API key to URL params                    │
│    - POSTs to Google Talent Solution               │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 4. Response handling                               │
│    - Success: Transform jobs, set results          │
│    - Empty: Show "no results" message              │
│    - Error: Display error message                  │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 5. UI Update                                       │
│    - Set isSearching = false                       │
│    - Render job cards                              │
│    - Enable search button                          │
└─────────────────────────────────────────────────────┘
```

## Question Generation Algorithm

```
┌─────────────────────────────────────────────────────┐
│ Input: Job Object                                  │
│ {                                                   │
│   title: "Senior Software Engineer",              │
│   description: "We are seeking...",               │
│   qualifications: "5+ years...",                  │
│   responsibilities: "Design and build..."         │
│ }                                                   │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 1: Extract key info                          │
│ - title = "Senior Software Engineer"              │
│ - description (cleaned, no HTML)                   │
│ - qualifications (cleaned)                         │
│ - responsibilities (cleaned)                       │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 2: Generate base questions                    │
│ [                                                   │
│   "Tell me about your experience with {title}...", │
│   "Walk me through your qualifications...",        │
│   "What interests you about this position...",     │
│   "Describe a challenging project...",             │
│   "How would you approach the responsibilities..." │
│ ]                                                   │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 3: Check for technical keywords              │
│ IF description contains:                           │
│   - "software" OR "engineer" OR "developer"       │
│ THEN add technical questions:                      │
│   - "Walk through a complex technical problem..."  │
│   - "How do you stay updated with tech..."        │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 4: Check for seniority level                 │
│ IF title contains:                                 │
│   - "senior" OR "lead" OR "manager"               │
│ THEN add leadership questions:                     │
│   - "How do you mentor junior members..."          │
│   - "Describe your leadership style..."            │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Step 5: Return questions array                     │
│ questions: [Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8]       │
│ (max 8 questions)                                  │
└─────────────────────────────────────────────────────┘
```

## File Structure

```
/src
├── interview_agent_ui.jsx          # Main app component
│   ├── Job search state variables
│   ├── handleJobSearch()
│   ├── handleGenerateInterview()
│   ├── generateQuestionsFromJob()
│   ├── handleApplyToJob()
│   └── Custom Interviews UI section
│
├── /utils
│   └── talentSolutionApi.js       # API helper functions
│       ├── searchJobs()
│       ├── applyToJob()
│       └── getJobDetails()
│
└── /components
    └── JobCard.jsx                 # Job display component
        ├── Job info display
        ├── Generate Interview button
        └── Apply button

/
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Template for .env
├── JOB_SEARCH_SETUP.md            # Setup guide
├── IMPLEMENTATION_SUMMARY.md       # Feature documentation
├── QUICK_START.md                  # Quick setup guide
└── ARCHITECTURE.md                 # This file
```

---

## Technology Stack

- **Frontend**: React 18
- **API**: Google Cloud Talent Solution REST API v4
- **UI Library**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React useState/useCallback
- **HTTP Client**: Fetch API
- **Build Tool**: Vite

---

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│ Browser (Client-Side)                              │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Environment Variables (import.meta.env)      │  │
│  │ - VITE_TALENT_API_KEY                        │  │
│  │ - VITE_TALENT_API_PROJECT                    │  │
│  └──────────────────────────────────────────────┘  │
│                    │                                │
│                    ▼                                │
│  ┌──────────────────────────────────────────────┐  │
│  │ talentSolutionApi.js                         │  │
│  │ - Reads env vars                             │  │
│  │ - Appends API key to request URL             │  │
│  └──────────────────────────────────────────────┘  │
│                    │                                │
└────────────────────┼────────────────────────────────┘
                     │
                     │ HTTPS Request
                     │ ?key={VITE_TALENT_API_KEY}
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Google Cloud Talent Solution API                   │
│ - Validates API key                                │
│ - Checks project permissions                       │
│ - Returns job data                                 │
└─────────────────────────────────────────────────────┘
```

### Security Considerations:

1. **API Key Visibility**:
   - ⚠️ Client-side API key visible in network requests
   - ✅ Mitigated by API key restrictions (domain, IP)
   - 🔒 Production: Move to backend proxy

2. **Data Privacy**:
   - ✅ No user PII sent to API
   - ✅ Search queries not logged
   - ✅ Job data from public API

3. **Rate Limiting**:
   - ⚠️ Client can make unlimited requests
   - 🔒 Production: Backend rate limiting needed

---

*Architecture documented: October 25, 2025*
