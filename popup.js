const WEBHOOK_URL = "Your Webhook URL";
const GEMINI_API_KEY = "Your Gemini API Key";

let currentProfile = null;


document.getElementById("generateBtn").addEventListener("click", generateMessages);

document.getElementById("scrapeBtn").addEventListener("click", async () => {
  const statusEl = document.getElementById("status");
  statusEl.innerText = "Scanning profile...";



  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: scrapeProfileData
  }, (results) => {
    if (chrome.runtime.lastError) {
      statusEl.innerText = "Script Error: " + chrome.runtime.lastError.message;
      console.error(chrome.runtime.lastError);
      return;
    }

    if (results && results[0] && results[0].result) {
      if (results[0].result.error) {
        statusEl.innerText = "Scraping Error: " + results[0].result.error;
        return;
      }

      currentProfile = results[0].result;

      // Enable Generate button
      document.getElementById("generateBtn").disabled = false;
      statusEl.innerText = "Profile scraped! Click 'Generate AI Drafts'.";

      // Save to Sheet
      fetch(WEBHOOK_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(currentProfile) })
        .catch(err => console.error("Webhook error:", err));
    } else {
      statusEl.innerText = "Error: No data returned from page.";
    }
  });
});

async function generateMessages() {
  const container = document.getElementById("draftContainer");
  const statusEl = document.getElementById("status");
  const btn = document.getElementById("generateBtn");

  container.innerHTML = "";
  statusEl.innerText = "AI is thinking...";
  btn.disabled = true;

  // Optimized prompt for LinkedIn's 300-character limit
  const prompt = `
    You are Abhyuday, a BITS Pilani student reaching out to ${currentProfile.name} (${currentProfile.role} at ${currentProfile.company}).

    CRITICAL RULES:
    1. Start EVERY message with: "Hi ${currentProfile.name.split(' ')[0]}, my name is Abhyuday, I am a student @ BITS Pilani,"
    2. Add ONE short, complete sentence after the intro. Keep it concise but natural.
    3. TOTAL message length MUST be under 300 characters (LinkedIn limit).
    4. End with proper punctuation. NO incomplete sentences or cut-off thoughts.
    5. Output ONLY valid JSON: {"casual": "...", "semi": "...", "formal": "..."}

    Message Styles:
    - casual: Friendly tone. Mention interest in product/tech chat. Keep it brief.
    - semi: Professional but warm. Reference ${currentProfile.company} briefly.
    - formal: Respectful. Acknowledge their ${currentProfile.role} experience concisely.
    
    Example length: "Hi John, my name is Abhyuday, I am a student @ BITS Pilani, and I'd love to chat about product!" (under 300 chars)`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorBody}`);
    }

    const json = await response.json();
    const rawText = json.candidates[0].content.parts[0].text;

    // Robust JSON extraction (removes markdown backticks if AI adds them)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const drafts = JSON.parse(jsonMatch[0]);

    statusEl.innerText = "Click a message to copy it:";
    btn.innerText = "Regenerate Options";
    btn.disabled = false;
    btn.className = "secondary-btn";

    renderBox("Casual", drafts.casual);
    renderBox("Semi-Formal", drafts.semi);
    renderBox("Formal", drafts.formal);

  } catch (err) {
    statusEl.innerText = `Error: ${err.message}`;
    console.error("Gemini Error:", err);
    btn.disabled = false;
  }
}

function renderBox(label, text) {
  const div = document.createElement("div");
  div.className = "draft-box";
  div.innerHTML = `<span class="label">${label}</span>${text}`;
  div.onclick = () => {
    navigator.clipboard.writeText(text);
    const original = div.innerHTML;
    div.innerHTML = `<span class="label" style="color:green;">Copied!</span>${text}`;
    setTimeout(() => div.innerHTML = original, 1500);
  };
  document.getElementById("draftContainer").appendChild(div);
}

function scrapeProfileData() {
  try {
    console.log("=== SCRAPING STARTED ===");

    // 1. EXTRACT NAME
    let name = "";
    const h1 = document.querySelector('h1');
    if (h1) name = h1.innerText.trim();
    if (!name) name = document.title.split("|")[0].trim();
    name = name.replace(/^\(\d+\)\s*/, "").split(" | ")[0].trim();
    console.log("✓ Name:", name);

    // 2. EXTRACT ROLE & COMPANY FROM EXPERIENCE SECTION
    let role = "";
    let company = "";

    // FIND EXPERIENCE SECTION
    let expSection = null;

    // Strategy 1: Direct ID lookup
    const expById = document.getElementById("experience");
    if (expById) {
      expSection = expById.closest("section");
      console.log("✓ Found via #experience ID");
    }

    // Strategy 2: Search for "Experience" heading
    if (!expSection) {
      const sections = document.querySelectorAll("section");
      for (const section of sections) {
        const heading = section.querySelector("h2, h3");
        if (heading && heading.innerText.trim().toLowerCase().includes("experience")) {
          expSection = section;
          console.log("✓ Found via heading text match");
          break;
        }
      }
    }

    if (expSection) {
      console.log("✓ Experience section located!");

      // NEW APPROACH: Use more specific selectors to avoid heading elements
      // LinkedIn typically structures experience items with specific div classes
      const firstListItem = expSection.querySelector("ul li");

      if (firstListItem) {
        console.log("→ Found first experience list item");

        // Try to find the actual role/company divs using more specific selectors
        // LinkedIn often uses divs with specific classes for role and company
        const roleDiv = firstListItem.querySelector('div[data-view-name="profile-component-entity"]');
        const allDivs = firstListItem.querySelectorAll('div');

        // Get all visible text nodes, excluding heading elements
        const visibleSpans = firstListItem.querySelectorAll('span[aria-hidden="true"]');
        let allText = [];

        if (visibleSpans.length > 0) {
          // Use aria-hidden spans (LinkedIn's preferred method)
          allText = Array.from(visibleSpans)
            .map(span => span.textContent.trim())
            .filter(t => t.length > 0);
          console.log("→ Using aria-hidden spans for extraction");
        } else {
          // Fallback: Get text from divs, but filter out heading elements
          const textNodes = [];
          for (const div of allDivs) {
            // Skip if this div contains a heading element
            if (div.querySelector('h1, h2, h3, h4, h5, h6')) {
              continue;
            }
            const text = div.textContent.trim();
            if (text && text.length > 0 && text.length < 200) {
              textNodes.push(text);
            }
          }
          // Remove duplicates and split by newlines
          allText = [...new Set(textNodes)]
            .flatMap(t => t.split('\n'))
            .map(t => t.trim())
            .filter(t => t.length > 0);
          console.log("→ Using div text extraction (fallback)");
        }

        // Filter out common UI label text patterns (but not job titles)
        allText = allText.filter(text => {
          const lower = text.toLowerCase();
          // Remove only generic UI labels, not actual job titles
          if (lower === 'experience') {
            console.log("→ Filtering out UI label:", text);
            return false;
          }
          return true;
        });

        console.log("→ Filtered experience item lines:", allText.slice(0, 8));

        // Detect profile structure by checking the second line
        if (allText.length > 0) {
          let isCompanyFirst = false;

          if (allText.length > 1) {
            const secondLine = allText[1];

            // Check if line starts with employment keyword or duration
            const startsWithEmployment = /^(Full-time|Part-time|Internship|Contract|Freelance)/i.test(secondLine);
            const startsWithDuration = /^\w{3}\s+\d{4}/i.test(secondLine);
            const onlyDuration = /^\d+\s*(yr|mo|year|month)/i.test(secondLine);

            if (startsWithEmployment || startsWithDuration || onlyDuration) {
              isCompanyFirst = true;
              console.log("→ Detected company-first structure");
            } else {
              console.log("→ Detected role-first structure");
            }
          }

          if (isCompanyFirst) {
            // Structure 1: First line is COMPANY, find ROLE later
            company = allText[0];
            console.log("→ Company (first line):", company);

            // Find the role - it's usually after location/employment details
            for (let i = 1; i < Math.min(allText.length, 8); i++) {
              const line = allText[i];

              // Skip duration lines
              if (line.match(/^\w{3}\s+\d{4}/i) || line.match(/\d+\s*(yr|mo|year|month)/i)) {
                console.log("→ Skipping duration line:", line);
                continue;
              }

              // Skip employment type lines
              if (line.includes('Full-time') || line.includes('Part-time') ||
                line.includes('Internship') || line.includes('Contract')) {
                console.log("→ Skipping employment type line:", line);
                continue;
              }

              // Skip location lines (contain commas, country/state names)
              if (line.includes(',') || line.match(/\b(India|USA|UK|Remote)\b/i)) {
                console.log("→ Skipping location line:", line);
                continue;
              }

              // Skip if it's a duplicate of the company
              if (line === company) {
                console.log("→ Skipping duplicate company line");
                continue;
              }

              // Skip if it contains separators (likely metadata)
              if (line.includes('·') || line.includes('•')) {
                console.log("→ Skipping metadata line:", line);
                continue;
              }

              // This should be the role
              if (line.length > 2 && line.length < 100) {
                role = line;
                console.log("→ Role found:", role);
                break;
              }
            }

          } else {
            // Structure 2: First line is ROLE, find COMPANY
            role = allText[0];
            console.log("→ Role (first line):", role);

            // Find the COMPANY line - contains · or employment keywords
            for (let i = 1; i < Math.min(allText.length, 8); i++) {
              const line = allText[i];

              // Skip if it's a duplicate of the role
              if (line === role) {
                console.log("→ Skipping duplicate role line");
                continue;
              }

              // Skip duration lines (e.g., "Jan 2026 - Present · 2 mos")
              if (line.match(/^\w{3}\s+\d{4}/i) || line.match(/\d+\s*(yr|mo|year|month)/i)) {
                console.log("→ Skipping duration line:", line);
                continue;
              }

              // This should be the COMPANY line if it contains separators (·, •, -) or employment keywords
              if (line.includes('·') || line.includes('•') || line.includes(' - ') ||
                line.includes('Full-time') || line.includes('Part-time') ||
                line.includes('Internship') || line.includes('Contract')) {

                // Extract company name (before the first separator)
                let extractedCompany = line.split(/[·•]|\s-\s/)[0].trim();

                // Validate it's not just an employment type
                const employmentTypes = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance', 'Self-employed'];
                if (!employmentTypes.includes(extractedCompany) && extractedCompany.length > 0) {
                  company = extractedCompany;
                  console.log("→ Company from line:", line);
                  console.log("→ Extracted company:", company);
                  break;
                } else {
                  console.log("→ Skipping line (employment type only):", line);
                }
              }

              // Also check if this line is just a company name without separators
              // (some profiles don't have · separators)
              if (!company && i === 1 && line.length > 2 && line.length < 100) {
                // Second line, reasonable length, might be company
                const employmentTypes = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Freelance', 'Self-employed'];
                if (!employmentTypes.includes(line)) {
                  company = line;
                  console.log("→ Company from standalone line:", line);
                  break;
                }
              }
            }
          }
        }
      } else {
        console.log("✗ No <li> found in Experience section");
      }
    } else {
      console.log("✗ Experience section NOT found");
    }

    console.log("Before fallback - Role:", role, "| Company:", company);

    // FALLBACK: Only if we found nothing
    if (!role && !company) {
      console.log("⚠ Using headline fallback - no experience data found");
      const headline = document.querySelector('div.text-body-medium');
      if (headline) {
        const headlineText = headline.innerText.trim();
        console.log("Headline:", headlineText);

        // Try to parse "Role at Company"
        if (headlineText.includes(" at ")) {
          const parts = headlineText.split(" at ");
          role = parts[0].trim();
          company = parts[1].trim();
        } else if (headlineText.includes(" | ")) {
          // If it's pipe-separated like "Flipkart | Telus AI | BITS Pilani"
          // Take the first as company
          const parts = headlineText.split(" | ");
          company = parts[0].trim();
          role = "Professional"; // Generic role
        } else {
          role = headlineText;
        }
      }
    }
    console.log("Role:", role);
    console.log("Company:", company);

    // Defaults
    if (!name) name = "User";
    if (!role) role = "Professional";
    if (!company) company = "their company";

    console.log("=== FINAL RESULTS ===");
    console.log("Name:", name);
    console.log("Role:", role);
    console.log("Company:", company);

    return {
      name,
      role,
      company,
      url: window.location.href,
      date: new Date().toLocaleDateString()
    };

  } catch (e) {
    console.error("❌ Scraping error:", e);
    return { error: e.toString() };
  }
}