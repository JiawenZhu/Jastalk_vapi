/**
 * Google Cloud Talent Solution API Helper
 * Documentation: https://cloud.google.com/talent-solution/job-search/docs/reference/rest
 */

// Environment variables for API configuration
const TALENT_API_PROJECT = import.meta.env.VITE_TALENT_API_PROJECT || '';
const TALENT_API_KEY = import.meta.env.VITE_TALENT_API_KEY || '';
const TALENT_API_TENANT = import.meta.env.VITE_TALENT_API_TENANT || '';

// API Base URLs
const TALENT_API_BASE = 'https://jobs.googleapis.com/v4';

/**
 * Search for jobs using Google Cloud Talent Solution API
 * @param {Object} params - Search parameters
 * @param {string} params.query - Job search query (job title, keywords, etc.)
 * @param {string} params.location - Location to search in
 * @param {number} params.pageSize - Number of results per page (default: 10)
 * @param {string} params.pageToken - Token for pagination
 * @returns {Promise<Object>} Search results with jobs array and nextPageToken
 */
export async function searchJobs({
  query = '',
  location = '',
  pageSize = 10,
  pageToken = '',
  employmentTypes = [],
  companies = []
}) {
  try {
    // Validate configuration
    if (!TALENT_API_PROJECT) {
      throw new Error('VITE_TALENT_API_PROJECT environment variable is not set');
    }
    if (!TALENT_API_KEY) {
      throw new Error('VITE_TALENT_API_KEY environment variable is not set');
    }

    // Build the parent path
    const parent = TALENT_API_TENANT
      ? `projects/${TALENT_API_PROJECT}/tenants/${TALENT_API_TENANT}`
      : `projects/${TALENT_API_PROJECT}`;

    // Construct the API endpoint
    const endpoint = `${TALENT_API_BASE}/${parent}/jobs:search`;

    // Build the request body according to API specs
    const requestBody = {
      requestMetadata: {
        userId: 'interview-agent-user',
        sessionId: `session-${Date.now()}`,
        domain: window.location.hostname
      },
      searchMode: 'JOB_SEARCH',
      jobQuery: {}
    };

    // Add query string if provided
    if (query) {
      requestBody.jobQuery.query = query;
    }

    // Add location filter if provided
    if (location) {
      requestBody.jobQuery.locationFilters = [
        {
          address: location
        }
      ];
    }

    // Add employment types filter
    if (employmentTypes && employmentTypes.length > 0) {
      requestBody.jobQuery.employmentTypes = employmentTypes;
    }

    // Add companies filter
    if (companies && companies.length > 0) {
      requestBody.jobQuery.companies = companies;
    }

    // Add pagination
    if (pageSize) {
      requestBody.maxPageSize = pageSize;
    }
    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    // Make the API request
    const response = await fetch(`${endpoint}?key=${TALENT_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Transform the response to a more usable format
    return {
      jobs: (data.matchingJobs || []).map(matchingJob => ({
        id: matchingJob.job?.name || '',
        title: matchingJob.job?.title || 'Untitled Position',
        company: matchingJob.job?.company || matchingJob.job?.companyDisplayName || 'Unknown Company',
        description: matchingJob.job?.description || '',
        location: matchingJob.job?.addresses?.[0] || matchingJob.job?.locationFilters?.[0]?.address || 'Remote',
        employmentTypes: matchingJob.job?.employmentTypes || [],
        postingDate: matchingJob.job?.postingPublishTime || matchingJob.job?.postingCreateTime || new Date().toISOString(),
        expiryDate: matchingJob.job?.postingExpireTime || null,
        applicationInfo: matchingJob.job?.applicationInfo || {},
        qualifications: matchingJob.job?.qualifications || '',
        responsibilities: matchingJob.job?.responsibilities || '',
        degree: matchingJob.job?.degreeTypes || [],
        companyDisplayName: matchingJob.job?.companyDisplayName || '',
        derivedInfo: matchingJob.job?.derivedInfo || {},
        raw: matchingJob.job // Keep raw data for reference
      })),
      nextPageToken: data.nextPageToken || null,
      totalSize: data.totalSize || 0,
      metadata: data.metadata || {}
    };
  } catch (error) {
    console.error('Error searching jobs:', error);
    throw error;
  }
}

/**
 * Apply to a job using Google Cloud Talent Solution API
 * Note: The actual application is typically handled by the company's ATS
 * This function records the application intent and redirects to the application URL
 *
 * @param {Object} params - Application parameters
 * @param {string} params.jobId - The job ID
 * @param {Object} params.applicationInfo - Application information from the job
 * @returns {Promise<Object>} Application result
 */
export async function applyToJob({ jobId, applicationInfo }) {
  try {
    // Extract application URLs from the job's applicationInfo
    const uris = applicationInfo?.uris || [];
    const emails = applicationInfo?.emails || [];
    const instruction = applicationInfo?.instruction || '';

    // If there's a direct application URL, open it
    if (uris.length > 0) {
      const applicationUrl = uris[0];

      // Log the application event (could send to analytics)
      console.log('Application initiated:', { jobId, applicationUrl });

      // Open application URL in new tab
      window.open(applicationUrl, '_blank', 'noopener,noreferrer');

      return {
        success: true,
        method: 'redirect',
        url: applicationUrl
      };
    }

    // If there's an email, create a mailto link
    if (emails.length > 0) {
      const email = emails[0];
      const mailtoUrl = `mailto:${email}?subject=Application for ${jobId}`;

      window.open(mailtoUrl, '_blank');

      return {
        success: true,
        method: 'email',
        email: email
      };
    }

    // If only instructions are provided, show them to the user
    if (instruction) {
      return {
        success: true,
        method: 'instruction',
        instruction: instruction
      };
    }

    // No application method available
    return {
      success: false,
      error: 'No application method available for this job'
    };
  } catch (error) {
    console.error('Error applying to job:', error);
    throw error;
  }
}

/**
 * Get job details by job ID
 * @param {string} jobId - The full job resource name
 * @returns {Promise<Object>} Job details
 */
export async function getJobDetails(jobId) {
  try {
    if (!TALENT_API_KEY) {
      throw new Error('VITE_TALENT_API_KEY environment variable is not set');
    }

    const endpoint = `${TALENT_API_BASE}/${jobId}`;

    const response = await fetch(`${endpoint}?key=${TALENT_API_KEY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Failed to get job details`);
    }

    const job = await response.json();
    return job;
  } catch (error) {
    console.error('Error getting job details:', error);
    throw error;
  }
}
