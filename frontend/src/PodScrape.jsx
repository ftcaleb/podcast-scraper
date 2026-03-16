import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PodScrape.css';
import { ENGAGEMENT_MESSAGES, STAGE_MESSAGES } from './constants/engagementMessages';

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

function ProgressBlock({
  channelName,
  percent,
  steps,
  isVisible,
  engagementMessage,
  scrapeDetail,
  downloadReady,
  downloadUrl
}) {
  if (!isVisible) return null;

  return (
    <div className="progress-block" style={{ animation: 'fadeUp 0.3s ease' }}>

      {/* Header */}
      <div className="progress-header">
        <span className="progress-channel">{channelName}</span>
        <span className="progress-percent">{percent}%</span>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percent}%`, transition: 'width 0.5s ease' }}
        />
      </div>

      {/* Step Log */}
      <div className="progress-log">
        {steps.map((step, idx) => (
          <div key={idx} className="log-line">
            <div
              className={`log-dot ${step.status}`}
              style={step.status === 'active' ? { animation: 'pulse 1.2s infinite' } : {}}
            />
            <span className={`log-text ${step.status}`}>{step.label}</span>
          </div>
        ))}
      </div>

      {/* Live detail (e.g. video count) */}
      {scrapeDetail && (
        <div className="scrape-detail">{scrapeDetail}</div>
      )}

      {/* Engagement message */}
      {engagementMessage && !downloadReady && (
        <div className="engagement-message">
          <span className="engagement-dot" />
          {engagementMessage}
        </div>
      )}

      {/* Download button */}
      {downloadReady && (
        <div className="download-ready">
          <p className="download-ready-text">{engagementMessage}</p>
          <a
            href={downloadUrl}
            className="download-button"
            target="_blank"
            rel="noreferrer"
          >
            Download Spreadsheet
          </a>
        </div>
      )}
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

  const [isProgressVisible, setIsProgressVisible] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [percent, setPercent] = useState(0);
  const [steps, setSteps] = useState([
    { label: 'Connecting to backend', status: 'pending' },
    { label: 'Resolving channel identity', status: 'pending' },
    { label: 'Fetching upload playlist', status: 'pending' },
    { label: 'Collecting all video IDs', status: 'pending' },
    { label: 'Fetching video metadata', status: 'pending' },
    { label: 'Running AI enrichment pass', status: 'pending' },
    { label: 'Writing to spreadsheet', status: 'pending' },
    { label: 'Finalising your download', status: 'pending' }
  ]);
  const [downloadReady, setDownloadReady] = useState(false);
  const [engagementMessage, setEngagementMessage] = useState('');
  const [scrapeDetail, setScrapeDetail] = useState('');

  const [statsVisible, setStatsVisible] = useState(false);
  const [downloadVisible, setDownloadVisible] = useState(false);
  const [episodesScraped, setEpisodesScraped] = useState(0);
  const [channelsDone, setChannelsDone] = useState(0);
  const [rowsInSheet, setRowsInSheet] = useState(0);

  const eventSourceRef = useRef(null);
  const engagementTimerRef = useRef(null);
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

  // ---- Toast helper ----
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  // ---- Engagement messages helpers ----
  const startEngagementMessages = useCallback(() => {
    let messageIndex = 0;

    setEngagementMessage(ENGAGEMENT_MESSAGES[0].text);
    messageIndex = 1;

    const rotate = () => {
      const delay = Math.floor(Math.random() * (18000 - 12000)) + 12000;

      engagementTimerRef.current = setTimeout(() => {
        if (messageIndex < ENGAGEMENT_MESSAGES.length) {
          setEngagementMessage(ENGAGEMENT_MESSAGES[messageIndex].text);
          messageIndex += 1;
        } else {
          messageIndex = 2;
          setEngagementMessage(ENGAGEMENT_MESSAGES[messageIndex].text);
        }
        rotate();
      }, delay);
    };

    rotate();
  }, []);

  const stopEngagementMessages = useCallback(() => {
    if (engagementTimerRef.current) {
      clearTimeout(engagementTimerRef.current);
      engagementTimerRef.current = null;
    }
  }, []);

  // ---- Stream & timer cleanup ----
  const closeStream = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch {
        // ignore
      }
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      closeStream();
      stopEngagementMessages();
    };
  }, [closeStream, stopEngagementMessages]);

  // ---- Progress state helpers ----
  const resetProgress = useCallback(() => {
    setPercent(0);
    setScrapeDetail('');
    setEngagementMessage('');
    setDownloadReady(false);
    setSteps([
      { label: 'Connecting to backend', status: 'pending' },
      { label: 'Resolving channel identity', status: 'pending' },
      { label: 'Fetching upload playlist', status: 'pending' },
      { label: 'Collecting all video IDs', status: 'pending' },
      { label: 'Fetching video metadata', status: 'pending' },
      { label: 'Running AI enrichment pass', status: 'pending' },
      { label: 'Writing to spreadsheet', status: 'pending' },
      { label: 'Finalising your download', status: 'pending' }
    ]);
    setChannelName('');
  }, []);

  const handleProgressEvent = useCallback(
    (event) => {
      const { stage, progress, status, detail, channel_name, episodes_count } = event;

      if (typeof progress === 'number') {
        setPercent(progress);
      }

      if (detail) {
        setScrapeDetail(detail);
      }

      if (status === 'active' && STAGE_MESSAGES[stage]) {
        setEngagementMessage(STAGE_MESSAGES[stage]);
      }

      setSteps((prev) => {
        const stageIndex = prev.findIndex((s) => s.label === stage);
        return prev.map((step, idx) => {
          if (step.label === stage) {
            return { ...step, status };
          }

          if (status === 'active' && stageIndex !== -1 && idx < stageIndex) {
            return { ...step, status: 'done' };
          }

          return step;
        });
      });

      if (status === 'error') {
        stopEngagementMessages();
        closeStream();
        setEngagementMessage(
          `Something went wrong: ${detail || 'Unknown error'}. Please try again.`
        );
        setIsScraping(false);
        setIsProgressVisible(false);
      }

      if ((progress === 100 || stage === 'Complete') && status === 'done') {
        stopEngagementMessages();
        setDownloadReady(true);
        setEngagementMessage('✅ Your spreadsheet is ready. Every episode, captured.');

        const finalEpisodes = episodes_count || 0;
        const finalChannelName = channel_name || channelName || parseChannelName(url);

        setEpisodesScraped(finalEpisodes);
        setChannelsDone((prev) => prev + 1);
        setRowsInSheet(finalEpisodes);

        // Persist history
        const newHistoryItem = {
          id: Date.now(),
          name: finalChannelName,
          url,
          date: Date.now(),
          episodes: finalEpisodes,
          status: 'complete'
        };

        setHistory((prev) => [newHistoryItem, ...prev]);

        setIsScraping(false);
        setStatsVisible(true);
        setDownloadVisible(true);
      }
    },
    [closeStream, stopEngagementMessages, channelName, url]
  );

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

    // Reset state
    closeStream();
    stopEngagementMessages();
    resetProgress();

    const normalizedChannel = parseChannelName(url);
    setChannelName(normalizedChannel);
    setIsProgressVisible(true);
    setIsScraping(true);
    setStatsVisible(false);
    setDownloadVisible(false);
    setEpisodesScraped(0);
    setChannelsDone(0);
    setRowsInSheet(0);

    // Activate first step
    setSteps((prev) =>
      prev.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'active' : 'pending'
      }))
    );

    startEngagementMessages();

    try {
      const controller = new AbortController();
      const response = await fetch(`${API_BASE_URL}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Scrape failed');
      }

      eventSourceRef.current = {
        close: () => controller.abort()
      };

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop();

        for (const line of parts) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          try {
            const event = JSON.parse(raw);
            handleProgressEvent(event);
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }

      closeStream();
    } catch (err) {
      // Ignore abort errors triggered by a normal stop
      const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted');
      if (!isAbort) {
        console.error('Stream error:', err);
        showToast('Connection lost. Please try again.', 'error');
        setIsProgressVisible(false);
        setIsScraping(false);
        stopEngagementMessages();
      }
    }
  }, [
    url,
    showToast,
    closeStream,
    stopEngagementMessages,
    resetProgress,
    startEngagementMessages,
    handleProgressEvent
  ]);

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
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !isScraping) {
        handleScrape();
      }
    },
    [handleScrape, isScraping]
  );

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
            channelName={channelName}
            percent={percent}
            steps={steps}
            isVisible={isProgressVisible}
            engagementMessage={engagementMessage}
            scrapeDetail={scrapeDetail}
            downloadReady={downloadReady}
            downloadUrl={`${API_BASE_URL}/api/download`}
          />
        </section>

        {/* ========== STATS STRIP ========== */}
        <StatsStrip
          episodesScraped={episodesScraped}
          channelsDone={channelsDone}
          rowsInSheet={rowsInSheet}
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
