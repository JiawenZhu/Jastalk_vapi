# Google Cloud Talent Solution Job Search Setup Guide

This guide will help you set up the Google Cloud Talent Solution API integration for the job search feature in the Custom Interviews page.

## Features

The job search integration provides:

1. **Job Search**: Search for real jobs using Google Cloud Talent Solution API
2. **Interactive Job Cards**: Display search results with detailed job information
3. **Generate Interview**: Automatically create customized interview questions based on job descriptions
4. **Apply to Jobs**: Direct application links or instructions from the job postings

## Prerequisites

- A Google Cloud Platform (GCP) account
- Billing enabled on your GCP project
- Basic knowledge of environment variables

## Setup Instructions

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Enter a project name (e.g., "interview-agent")
4. Click "Create"
5. Note your **Project ID** (you'll need this later)

### Step 2: Enable the Cloud Talent Solution API

1. In the Google Cloud Console, go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search for "Cloud Talent Solution API"
3. Click on "Cloud Talent Solution API"
4. Click "Enable"

### Step 3: Create an API Key

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API Key"
3. Copy the generated API key
4. (Recommended) Click "Restrict Key" and:
   - Under "API restrictions", select "Restrict key"
   - Choose "Cloud Talent Solution API"
   - Click "Save"

### Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Google Cloud credentials:
   ```bash
   # Replace with your actual values
   VITE_TALENT_API_PROJECT=your-project-id
   VITE_TALENT_API_KEY=your-api-key-here
   ```

3. (Optional) If using multi-tenancy, add your tenant ID:
   ```bash
   VITE_TALENT_API_TENANT=your-tenant-id
   ```

### Step 5: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the "Custom Interviews" page

3. Try searching for a job:
   - Enter a job title (e.g., "Software Engineer")
   - Optionally add a location (e.g., "San Francisco, CA")
   - Click "Search"

4. If configured correctly, you should see job search results!

## API Limits and Pricing

### Free Tier
- Google Cloud Talent Solution offers a free tier
- Check current limits at: https://cloud.google.com/talent-solution/job-search/pricing

### Rate Limits
- The API has rate limits per project
- Implement caching if you expect high traffic
- Monitor usage in the [GCP Console](https://console.cloud.google.com/)

## Troubleshooting

### "API key not set" Error
- Verify `.env` file exists in the project root
- Check that `VITE_TALENT_API_KEY` is set correctly
- Restart the development server after changing `.env`

### "Permission denied" Error
- Ensure the Cloud Talent Solution API is enabled
- Verify your API key has permissions for the API
- Check that billing is enabled on your GCP project

### No Results Found
- The Cloud Talent Solution API searches real job postings
- Try broader search terms (e.g., "developer" instead of "senior react developer")
- Some locations might have fewer jobs
- Verify your project has job postings configured (or use public job search)

### API Request Failed
- Check the browser console for detailed error messages
- Verify your Project ID is correct
- Ensure API key restrictions aren't blocking requests
- Check GCP Console for API quota issues

## Advanced Configuration

### Multi-Tenancy

If you're building a multi-tenant application:

1. Create a tenant in GCP:
   ```bash
   POST https://jobs.googleapis.com/v4/projects/{project}/tenants
   ```

2. Add tenant ID to `.env`:
   ```bash
   VITE_TALENT_API_TENANT=your-tenant-id
   ```

### Custom Search Filters

Edit `/src/utils/talentSolutionApi.js` to add more search filters:

```javascript
// Example: Filter by employment type
const result = await searchJobs({
  query: 'software engineer',
  location: 'Remote',
  employmentTypes: ['FULL_TIME', 'CONTRACT'],
  companies: ['companies/123']  // Specific company filter
});
```

### Pagination

The API supports pagination for large result sets:

```javascript
const firstPage = await searchJobs({ query: 'engineer', pageSize: 10 });
const secondPage = await searchJobs({
  query: 'engineer',
  pageSize: 10,
  pageToken: firstPage.nextPageToken
});
```

## API Reference

For complete API documentation, visit:
- [Cloud Talent Solution REST API](https://cloud.google.com/talent-solution/job-search/docs/reference/rest)
- [Job Search Guide](https://cloud.google.com/talent-solution/job-search/docs)

## Security Best Practices

1. **Never commit API keys to version control**
   - `.env` is in `.gitignore` by default
   - Use environment variables in production

2. **Restrict API keys**
   - Limit to specific APIs
   - Set HTTP referrer restrictions in production
   - Rotate keys regularly

3. **Monitor usage**
   - Set up billing alerts
   - Monitor API quotas
   - Review access logs

## Support

For issues specific to:
- **API setup**: Check [GCP Documentation](https://cloud.google.com/talent-solution/job-search/docs)
- **Integration bugs**: Open an issue in this repository
- **Feature requests**: Contact the development team

## Example Search Queries

Try these searches to test the integration:

1. **Software Jobs**:
   - Query: "Software Engineer"
   - Location: "San Francisco, CA"

2. **Remote Jobs**:
   - Query: "Developer"
   - Location: "Remote"

3. **Specific Role**:
   - Query: "Senior Product Manager"
   - Location: "New York, NY"

4. **Industry-Specific**:
   - Query: "Data Scientist"
   - Location: "Seattle, WA"

## Next Steps

After setting up the API:

1. Customize the `generateQuestionsFromJob()` function to create better interview questions
2. Add analytics to track which jobs users search for
3. Implement saved searches or job alerts
4. Add filters for salary, experience level, etc.

---

Happy interviewing! 🎯
