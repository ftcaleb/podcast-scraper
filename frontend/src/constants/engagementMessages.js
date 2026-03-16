export const ENGAGEMENT_MESSAGES = [
  // --- Opening messages (shown first) ---
  {
    text: "Dialling into YouTube's API... this won't take long.",
    timing: 'early'
  },
  {
    text: "We're pulling every episode from this channel. Sit tight.",
    timing: 'early'
  },

  // --- Mid-scrape informative ---
  {
    text: "Large channels can take 2–4 minutes. We're getting everything.",
    timing: 'mid'
  },
  {
    text: "The more episodes a channel has, the more gold we dig up.",
    timing: 'mid'
  },
  {
    text: "We're not just getting titles — guests, views, durations, links. All of it.",
    timing: 'mid'
  },
  {
    text: "YouTube rate limits us to 50 videos per request. We keep looping until we have them all.",
    timing: 'mid'
  },
  {
    text: "This is the part where most tools give up. We don't.",
    timing: 'mid'
  },
  {
    text: "Fetching metadata on every single video. No skipping.",
    timing: 'mid'
  },
  {
    text: "Did you know the average podcast episode gets watched for just 4 minutes? We track all of that.",
    timing: 'mid'
  },

  // --- AI enrichment phase ---
  {
    text: "AI is scanning descriptions to extract guest names and industries. This is the clever part.",
    timing: 'enrichment'
  },
  {
    text: "Our AI reads every episode description so you don't have to. Guest intel incoming.",
    timing: 'enrichment'
  },
  {
    text: "Matching guests to industries... this is what makes your spreadsheet actually useful.",
    timing: 'enrichment'
  },
  {
    text: "The enrichment pass is running. It's like having a research assistant work through every episode.",
    timing: 'enrichment'
  },

  // --- Long wait messages ---
  {
    text: "Still here. Still working. This channel has a lot of content — that's a good thing.",
    timing: 'long'
  },
  {
    text: "Good things take time. A complete dataset takes a little longer.",
    timing: 'long'
  },
  {
    text: "We could rush this. But then your spreadsheet would be missing data. So we won't.",
    timing: 'long'
  },
  {
    text: "Most scrapers stop at 50 videos. PodScrape keeps going until it has every single one.",
    timing: 'long'
  },
  {
    text: "Your coffee is getting cold. Your data is getting complete. Worth it.",
    timing: 'long'
  },

  // --- Near completion ---
  {
    text: "Almost there — writing everything into your spreadsheet.",
    timing: 'late'
  },
  {
    text: "Final pass. Organising your data into clean columns.",
    timing: 'late'
  },
  {
    text: "Formatting your Excel file. Every column sized. Every row labelled.",
    timing: 'late'
  },
  {
    text: "The hard work is done. Just packaging it up for you.",
    timing: 'late'
  }
];

export const STAGE_MESSAGES = {
  'Connecting to backend':
    "Opening a connection to the scraping engine...",
  'Resolving channel identity':
    "Looking up this channel across YouTube's database...",
  'Fetching upload playlist':
    "Every YouTube channel has a hidden uploads playlist. Found it.",
  'Collecting all video IDs':
    "Paginating through every video this channel has ever posted...",
  'Fetching video metadata':
    "Pulling titles, descriptions, views, likes, and durations for every video...",
  'Running AI enrichment pass':
    "AI is now reading every description to extract guest names, industries, and social links...",
  'Writing to spreadsheet':
    "Organising everything into a clean, formatted Excel file...",
  'Finalising your download':
    "Almost done — your spreadsheet is being prepared for download."
};
