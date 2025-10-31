'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  BriefcaseIcon, 
  SparklesIcon, 
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  ClipboardIcon,
  LinkIcon,
  CalculatorIcon
} from '../components/icons';
import { analyzeResume, searchJobs, generateInterviewQuestions } from '../services/geminiService';
import { extractTextFromPDF, isPDFFile, isValidPDFSize } from '../services/pdfProcessor';
import type { ResumeAnalysis, Job, TokenUsage, LoadingState } from '../types';

export default function HomePage() {
  // Main state
  const [step, setStep] = useState<'resume' | 'results'>('resume');
  const [uploadTab, setUploadTab] = useState<'paste' | 'upload' | 'linkedin' | 'history'>('paste');
  const [resumeText, setResumeText] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [totalTokenUsage, setTotalTokenUsage] = useState<TokenUsage>({ promptTokens: 0, candidatesTokens: 0, totalTokens: 0 });
  
  // PDF upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [useAIScan, setUseAIScan] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Loading states
  const [loadingState, setLoadingState] = useState<LoadingState>({
    analysis: false,
    jobs: false,
    questions: false,
    parsing: false
  });

  const updateTokenUsage = useCallback((usage: TokenUsage) => {
    setTotalTokenUsage(prev => ({
      promptTokens: prev.promptTokens + usage.promptTokens,
      candidatesTokens: prev.candidatesTokens + usage.candidatesTokens,
      totalTokens: prev.totalTokens + usage.totalTokens
    }));
  }, []);

  const resetState = () => {
    setStep('resume');
    setResumeText('');
    setLinkedInUrl('');
    setResumeAnalysis(null);
    setJobs([]);
    setError(null);
    setSelectedJob(null);
    setInterviewQuestions([]);
    setSelectedFile(null);
    setIsDragOver(false);
    setUseAIScan(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResumeAnalysis = async () => {
    if (!resumeText.trim() && !linkedInUrl.trim() && !selectedFile) {
      setError('Please enter resume text, upload a PDF file, or provide a LinkedIn URL');
      return;
    }

    setLoadingState(prev => ({ ...prev, analysis: true }));
    setError(null);

    try {
      let input: any;
      
      if (selectedFile && useAIScan) {
        input = { pdfFile: selectedFile };
      } else if (resumeText.trim()) {
        input = { resumeText: resumeText.trim() };
      } else if (linkedInUrl.trim()) {
        input = { linkedInUrl: linkedInUrl.trim() };
      }
      
      const { analysis, usage } = await analyzeResume(input);
      setResumeAnalysis(analysis);
      updateTokenUsage(usage);
      
      if (analysis.potentialJobTitles && analysis.potentialJobTitles.length > 0) {
        handleJobSearch(analysis.potentialJobTitles[0]);
      }
      
      setStep('results');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingState(prev => ({ ...prev, analysis: false }));
    }
  };

  const handleJobSearch = async (query: string) => {
    setLoadingState(prev => ({ ...prev, jobs: true }));
    setError(null);

    try {
      const { jobs: jobResults, usage } = await searchJobs(query);
      setJobs(jobResults);
      updateTokenUsage(usage);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingState(prev => ({ ...prev, jobs: false }));
    }
  };

  const handleGenerateQuestions = async (job: Job) => {
    setLoadingState(prev => ({ ...prev, questions: true }));
    setError(null);
    setSelectedJob(job);

    try {
      const { questions, usage } = await generateInterviewQuestions(job.title, job.description);
      setInterviewQuestions(questions);
      updateTokenUsage(usage);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingState(prev => ({ ...prev, questions: false }));
    }
  };

  // PDF Processing Functions
  const handleFileSelect = async (file: File) => {
    if (!isPDFFile(file)) {
      setError('Please select a valid PDF file.');
      return;
    }

    if (!isValidPDFSize(file)) {
      setError('File size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);

    if (!useAIScan) {
      setLoadingState(prev => ({ ...prev, parsing: true }));
      try {
        const extractedText = await extractTextFromPDF(file);
        if (extractedText.trim()) {
          setResumeText(extractedText);
          setUploadTab('paste');
        } else {
          setError('No text could be extracted from this PDF. Please try a different file or paste your resume text manually.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingState(prev => ({ ...prev, parsing: false }));
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setResumeText('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">AI Job Fit Analyzer</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Analyze your resume, find matching jobs, and practice interviews with AI</p>

        {/* Step Navigation */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'resume' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            } transition-colors`}>
              <DocumentTextIcon className="w-4 h-4" />
            </div>
            <span className={`ml-2 text-sm font-medium ${
              step === 'resume' ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
            }`}>Resume Analysis</span>
            <div className="w-16 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4" />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'results' ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            } transition-colors`}>
              <BriefcaseIcon className="w-4 h-4" />
            </div>
            <span className={`ml-2 text-sm font-medium ${
              step === 'results' ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
            }`}>Job Matching & Interview Prep</span>
          </div>
        </div>

        {/* Resume Analysis Step */}
        {step === 'resume' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm mb-8">
              <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Upload Your Resume</h2>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                {[
                  { id: 'paste', label: 'Paste Text', icon: ClipboardIcon },
                  { id: 'upload', label: 'Upload PDF', icon: ArrowUpTrayIcon },
                  { id: 'linkedin', label: 'LinkedIn URL', icon: LinkIcon }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setUploadTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      uploadTab === tab.id
                        ? 'bg-white dark:bg-gray-800 text-orange-500 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {uploadTab === 'paste' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Paste your resume text here
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Copy and paste your resume content here..."
                    className="w-full h-64 px-4 py-3 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                  />
                </div>
              )}

              {uploadTab === 'upload' && (
                <div>
                  {/* AI Scan Toggle */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">PDF Analysis Method</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {useAIScan 
                            ? 'AI will analyze your PDF directly for better accuracy'
                            : 'Extract text first, then analyze (faster but may miss formatting)'
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => setUseAIScan(!useAIScan)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                          useAIScan ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            useAIScan ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {useAIScan ? '🤖 AI Scan (Recommended)' : '📝 Text Extraction'}
                    </div>
                  </div>

                  {!selectedFile ? (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                        isDragOver
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {loadingState.parsing ? (
                        <div className="flex flex-col items-center">
                          <ArrowPathIcon className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-spin" />
                          <p className="text-gray-600 dark:text-gray-400 mb-2">Extracting text from PDF...</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">This may take a moment</p>
                        </div>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400 mb-2">
                            {isDragOver ? 'Drop your PDF file here' : 'Drag and drop your PDF resume here'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">or click to browse files</p>
                          <button
                            type="button"
                            className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                          >
                            Select PDF File
                          </button>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Supports PDF files up to 10MB
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <DocumentTextIcon className="w-8 h-8 text-orange-500" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={clearSelectedFile}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                          Choose Different File
                        </button>
                        {resumeText && (
                          <button
                            onClick={() => setUploadTab('paste')}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                          >
                            View Extracted Text
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              {uploadTab === 'linkedin' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="url"
                    value={linkedInUrl}
                    onChange={(e) => setLinkedInUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/your-profile"
                    className="w-full px-4 py-3 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Note: Only public LinkedIn profiles can be analyzed
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleResumeAnalysis}
                  disabled={loadingState.analysis || (!resumeText.trim() && !linkedInUrl.trim() && !selectedFile)}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {loadingState.analysis ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <SparklesIcon className="w-5 h-5" />
                  )}
                  {loadingState.analysis 
                    ? (selectedFile && useAIScan ? 'AI Scanning PDF...' : 'Analyzing...')
                    : (selectedFile && useAIScan ? 'AI Scan Resume' : 'Analyze Resume')
                  }
                </button>
                
                <button
                  onClick={resetState}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
              
              {/* Error Display */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Token Usage Display */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CalculatorIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Token Usage</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">{totalTokenUsage.promptTokens.toLocaleString()}</div>
                  <div className="text-gray-500 dark:text-gray-400">Prompt</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">{totalTokenUsage.candidatesTokens.toLocaleString()}</div>
                  <div className="text-gray-500 dark:text-gray-400">Response</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-orange-600">{totalTokenUsage.totalTokens.toLocaleString()}</div>
                  <div className="text-gray-500 dark:text-gray-400">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && resumeAnalysis && (
          <div className="max-w-6xl mx-auto">
            {/* Resume Analysis Results */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Resume Analysis</h2>
                <button
                  onClick={() => setStep('resume')}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  ← Edit Resume
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Professional Summary</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{resumeAnalysis.summary}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {resumeAnalysis.skills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Potential Job Titles</h3>
                    <div className="space-y-2">
                      {resumeAnalysis.potentialJobTitles.map((title, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-900 dark:text-white font-medium">{title}</span>
                          <button
                            onClick={() => handleJobSearch(title)}
                            className="ml-auto text-orange-500 hover:text-orange-600 text-sm font-medium"
                          >
                            Search Jobs
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-center mb-4">
                      <AcademicCapIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{resumeAnalysis.experience}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Experience</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Search Results */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Matching Jobs</h2>
                <div className="flex items-center gap-4">
                  {loadingState.jobs && (
                    <div className="flex items-center gap-2 text-orange-500">
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {jobs.length} jobs found
                  </span>
                </div>
              </div>
              
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <BriefcaseIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">No jobs found yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Click "Search Jobs" next to a job title above to find matching positions</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {jobs.map((job) => (
                    <div key={job.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg border p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <BriefcaseIcon className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{job.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{job.company} • {job.location}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{job.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t dark:border-gray-600">
                        <button
                          onClick={() => handleGenerateQuestions(job)}
                          disabled={loadingState.questions && selectedJob?.id === job.id}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {loadingState.questions && selectedJob?.id === job.id ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <SparklesIcon className="w-4 h-4" />
                          )}
                          {loadingState.questions && selectedJob?.id === job.id ? 'Generating...' : 'Generate Questions'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generated Questions */}
            {interviewQuestions.length > 0 && selectedJob && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Interview Questions</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Generated for {selectedJob.title} at {selectedJob.company}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {interviewQuestions.map((question, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="text-gray-900 dark:text-white font-medium leading-relaxed">{question}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}