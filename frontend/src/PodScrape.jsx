import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PodScrape.css';

/**
 * PodScrape - YouTube Podcast Scraper Frontend
 * A single-page application for scraping podcast metadata from YouTube channels.
 * Connected to Python Flask backend at http://localhost:5000
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://localhost:5000';

// ============================================================================
// UTILITY FUNCTIONS & API CALLS
// ============================================================================

/**
 * Extract channel name from various YouTube URL formats.
 * Accepts: @handle, /channel/ID, /c/name, /user/name formats
 */
function parseChannelName(url) {
  if (!url) return '';
  
  const patterns = [
    /@([a-zA-Z0-9_-]+)/,           // @handle
    /\/channel\/([a-zA-Z0-9_-]+)/, // /channel/ID
    /\/c\/([a-zA-Z0-9_-]+)/,       // /c/name
    /\/user\/([a-zA-Z0-9_-]+)/,    // /user/name
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return url;
}

/**
 * Validate YouTube URL format
 */
function isValidYouTubeURL(url) {
  if (!url || url.trim().length < 4) return false;
  return /(@[a-zA-Z0-9_-]+|\/channel\/|\/c\/|\/user\/|youtube\.com)/.test(url);
}

/**
 * Truncate URL to max length with ellipsis
 */
function truncateUrl(url, maxLength = 42) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '…';
}

/**
 * Format date as relative (e.g., "2 hours ago") or absolute
 */
function formatDate(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Call backend to initiate scrape
 * POST /api/scrape with YouTube URL
 */
async function callScrapeAPI(url) {
  const response = await fetch(`${API_BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Scrape failed');
  }

  return await response.json();
}

/**
 * Poll scrape progress (optional - not currently used)
 * GET /api/scrape/status
 */
async function pollScrapeStatus() {
  const response = await fetch(`${API_BASE_URL}/api/scrape/status`);
  
  if (!response.ok) {
    throw new Error('Failed to poll status');
  }

  return await response.json();
}

/**
 * Trigger download of Excel file
 * GET /api/download - returns blob to trigger browser download
 */
async function triggerDownload() {
  const response = await fetch(`${API_BASE_URL}/api/download`);
  
  if (!response.ok) {
    throw new Error('Download failed');
  }

  // Get the blob
  const blob = await response.blob();
  
  // Create a download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Podcast_Scraper_Database.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ============================================================================
// TOAST NOTIFICATION COMPONENT
// ============================================================================

function Toast({ message, type = 'info', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`toast toast-${type}`} role="alert">
      {message}
    </div>
  );
}

// ============================================================================
// PROGRESS BLOCK COMPONENT
// ============================================================================

function ProgressBlock({ channelName, percent, steps, isVisible }) {
  if (!isVisible) return null;

  return (
    <div className="progress-block" style={{ animation: 'fadeUp 0.3s ease' }}>
      <div className="progress-header">
        <span className="progress-channel">{channelName}</span>
        <span className="progress-percent">{percent}%</span>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="progress-log">
        {steps.map((step, idx) => (
          <div key={idx} className="log-line">
            <div 
              className={`log-dot ${step.status}`}
              style={step.status === 'active' ? { animation: 'pulse 1.2s infinite' } : {}}
            />
            <span className="log-text">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STATS STRIP COMPONENT
// ============================================================================

function StatsStrip({ episodesScraped, channelsDone, rowsInSheet, isVisible }) {
  if (!isVisible) return null;

  const stats = [
    { value: episodesScraped, label: 'Episodes Scraped' },
    { value: channelsDone, label: 'Channels Done' },
    { value: rowsInSheet, label: 'Rows in Sheet' }
  ];

  return (
    <div className="stats-strip" style={{ animation: 'fadeUp 0.4s ease' }}>
      {stats.map((stat, idx) => (
        <div key={idx} className="stat-card">
          <div className="stat-value">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// DOWNLOAD BANNER COMPONENT
// ============================================================================

function DownloadBanner({ isVisible, onDownload }) {
  if (!isVisible) return null;

  return (
    <div className="download-banner" style={{ animation: 'fadeUp 0.4s ease' }}>
      <div className="download-text">
        <h3 className="download-heading">Your spreadsheet is ready.</h3>
        <p className="download-subtext">
          All scraped episodes with AI-enriched guest data are compiled into Podcast_Scraper_Database.xlsx.
        </p>
      </div>
      <button className="download-button" onClick={onDownload}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 1v10M4 7l4 4 4-4M2 14h12" />
        </svg>
        Download .xlsx
      </button>
    </div>
  );
}

// ============================================================================
// SCRAPE HISTORY COMPONENT
// ============================================================================

function ScrapeHistory({ items }) {
  return (
    <div className="history-section">
      <div className="history-divider">
        <span>Scrape History</span>
      </div>

      {items.length === 0 ? (
        <div className="history-empty">
          No channels scraped yet. Paste a YouTube channel URL above to get started.
        </div>
      ) : (
        <div className="history-list">
          {items.map((item, idx) => (
            <div 
              key={item.id} 
              className="history-item"
              style={{ animation: `fadeUp 0.3s ease ${idx * 50}ms backwards` }}
            >
              {/* Index */}
              <div className="history-index">
                {String(idx + 1).padStart(2, '0')}
              </div>

              {/* Icon box */}
              <div className="history-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <polygon points="9,7 9,17 17,12" fill="currentColor" />
                </svg>
              </div>

              {/* Info block */}
              <div className="history-info">
                <div className="history-name">{item.name}</div>
                <div className="history-meta">
                  {formatDate(item.date)} · {truncateUrl(item.url)}
                </div>
              </div>

              {/* Episode count */}
              {item.episodes && (
                <div className="history-episodes">
                  {item.episodes} eps
                </div>
              )}

              {/* Status pill */}
              <div className={`history-status status-${item.status}`}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN PODSCRAPE COMPONENT
// ============================================================================

export default function PodScrape() {
  // ---- State ----
  const [url, setUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(null);
  const [progressVisible, setProgressVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [downloadVisible, setDownloadVisible] = useState(false);
  const [currentProgress, setCurrentProgress] = useState({
    channelName: '',
    percent: 0,
    steps: [],
    episodesScraped: 0,
    channelsDone: 0,
    rowsInSheet: 0
  });
  const inputRef = useRef(null);

  // ---- Initialization: Load history from localStorage ----
  useEffect(() => {
    const saved = localStorage.getItem('podscrape_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // ---- Save history to localStorage whenever it changes ----
  useEffect(() => {
    localStorage.setItem('podscrape_history', JSON.stringify(history));
  }, [history]);

  // ---- Show toast notification ----
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  // ---- Handle scrape start ----
  const handleScrape = useCallback(async () => {
    // Validation
    if (!url.trim() || url.trim().length < 4) {
      showToast('Please enter a valid YouTube channel URL.', 'error');
      return;
    }

    if (!isValidYouTubeURL(url)) {
      showToast('Please enter a valid YouTube channel URL.', 'error');
      return;
    }

    const channelName = parseChannelName(url);

    // Start scraping
    setIsScraping(true);
    setProgressVisible(true);
    setStatsVisible(false);
    setDownloadVisible(false);

    // Initialize progress steps
    const logSteps = [
      { label: 'Connecting to backend…', status: 'active' },
      { label: 'Resolving channel ID…', status: 'pending' },
      { label: 'Fetching upload playlist…', status: 'pending' },
      { label: 'Collecting video IDs…', status: 'pending' },
      { label: 'Fetching metadata for videos…', status: 'pending' },
      { label: 'Running AI enrichment pass…', status: 'pending' },
      { label: 'Writing to spreadsheet…', status: 'pending' }
    ];

    setCurrentProgress({
      channelName: channelName,
      percent: 0,
      steps: logSteps,
      episodesScraped: 0,
      channelsDone: 0,
      rowsInSheet: 0
    });

    try {
      // Use Server-Sent Events (SSE) to stream progress from backend
      const eventSource = new EventSource(
        `${API_BASE_URL}/api/scrape?url=${encodeURIComponent(url)}`
      );

      let completedSteps = 0;
      let finalEpisodes = 0;
      let finalChannelName = channelName;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'progress') {
            // Update progress bar and step
            const stepIndex = Math.floor((data.progress - 10) / 12.86); // Map progress % to step index
            
            setCurrentProgress(prev => ({
              ...prev,
              percent: data.progress,
              steps: prev.steps.map((step, idx) => ({
                ...step,
                status: idx < stepIndex ? 'complete' : idx === stepIndex ? 'active' : 'pending'
              }))
            }));

          } else if (data.type === 'complete') {
            eventSource.close();

            if (data.status === 'success') {
              finalEpisodes = data.episodes_count || 0;
              finalChannelName = data.channel_name || channelName;

              // Update to show completion
              setCurrentProgress(prev => ({
                ...prev,
                percent: 100,
                steps: [
                  ...prev.steps.map(s => ({ ...s, status: 'complete' })),
                  { 
                    label: `✓ ${finalEpisodes} episodes written to Podcast_Scraper_Database.xlsx`, 
                    status: 'complete' 
                  }
                ],
                episodesScraped: finalEpisodes,
                channelsDone: 1,
                rowsInSheet: finalEpisodes
              }));

              // Add to history
              const newHistoryItem = {
                id: Date.now(),
                name: finalChannelName,
                url,
                date: Date.now(),
                episodes: finalEpisodes,
                status: 'complete'
              };

              setHistory(prev => [newHistoryItem, ...prev]);

              // Show success toast
              showToast(
                `"${finalChannelName}" scraped — ${finalEpisodes} episodes ready.`,
                'success'
              );

              // Show stats and download banner
              setTimeout(() => {
                setStatsVisible(true);
                setDownloadVisible(true);
              }, 500);

              // Auto-hide progress block after 3 seconds
              setTimeout(() => {
                setProgressVisible(false);
              }, 3000);

              // Clear input
              setUrl('');

            } else {
              // Error case
              showToast(`Scrape failed: ${data.message}`, 'error');
              setProgressVisible(false);
            }

            setIsScraping(false);
          }

        } catch (e) {
          console.error('Error parsing SSE message:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        showToast('Connection lost. Please try again.', 'error');
        setProgressVisible(false);
        setIsScraping(false);
      };

    } catch (error) {
      console.error('Scrape error:', error);
      showToast(`Scrape failed: ${error.message}`, 'error');
      setProgressVisible(false);
      setIsScraping(false);
    }

  }, [url, showToast]);

  // ---- Handle download ----
  const handleDownload = useCallback(async () => {
    showToast('Downloading Podcast_Scraper_Database.xlsx…', 'success');
    try {
      await triggerDownload();
    } catch (error) {
      console.error('Download error:', error);
      showToast('Download failed. Please try again.', 'error');
    }
  }, [showToast]);

  // ---- Handle Enter key in input ----
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !isScraping) {
      handleScrape();
    }
  }, [handleScrape, isScraping]);

  return (
    <div className="podscrape">
      {/* Background grid overlay */}
      <div className="bg-grid" />

      {/* Main content container */}
      <div className="container">
        {/* ========== HEADER ========== */}
        <header className="header">
          <div className="logo">
            <img src="/melsoft_logo.png" alt="Melsoft Logo" className="logo-image" />
          </div>
          <div className="header-badge">YouTube Data Extractor</div>
        </header>

        {/* ========== HERO ========== */}
        <section className="hero">
          <div className="hero-label">// Podcast Intelligence Tool</div>
          <h1 className="hero-heading">
            Scrape any podcast. <span className="hero-accent">Export everything.</span>
          </h1>
          <p className="hero-subtitle">
            Paste a YouTube channel URL below. PodScrape pulls every episode — titles, guests, views, 
            likes, tags, durations — and writes it all into your spreadsheet.
          </p>
        </section>

        {/* ========== SEARCH SECTION ========== */}
        <section className="search-section">
          {/* Search input bar */}
          <div className="search-bar">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="https://youtube.com/@DiaryOfACEO or channel URL…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isScraping}
            />
            <button
              className="scrape-button"
              onClick={handleScrape}
              disabled={isScraping}
            >
              {isScraping ? 'Scraping…' : 'Scrape →'}
            </button>
          </div>

          {/* Hint line */}
          <div className="search-hint">
            Accepts <code>@handle</code>, <code>/channel/ID</code>, or <code>/c/name</code> formats · Press <code>Enter</code> to start
          </div>

          {/* Progress block */}
          <ProgressBlock
            channelName={currentProgress.channelName}
            percent={currentProgress.percent}
            steps={currentProgress.steps}
            isVisible={progressVisible}
          />
        </section>

        {/* ========== STATS STRIP ========== */}
        <StatsStrip
          episodesScraped={currentProgress.episodesScraped}
          channelsDone={currentProgress.channelsDone}
          rowsInSheet={currentProgress.rowsInSheet}
          isVisible={statsVisible}
        />

        {/* ========== DOWNLOAD BANNER ========== */}
        <DownloadBanner
          isVisible={downloadVisible}
          onDownload={handleDownload}
        />

        {/* ========== SCRAPE HISTORY ========== */}
        <ScrapeHistory items={history} />

        {/* ========== FOOTER ========== */}
        <footer className="footer">
          <div className="footer-left">
            PodScrape v1.0 · YouTube Data API v3
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Docs</a>
            <a href="#" className="footer-link">API Keys</a>
            <a href="#" className="footer-link">GitHub</a>
          </div>
        </footer>
      </div>

      {/* ========== TOASTS ========== */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
