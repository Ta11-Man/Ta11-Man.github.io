const eyes = document.querySelectorAll(".eye");
const pupils = document.querySelectorAll(".pupil");
const maxPupilMove = 1.2; // in vh units

function movePupils(e) {
  const clientX = e.type.startsWith("touch") ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith("touch") ? e.touches[0].clientY : e.clientY;
  if (e.type.startsWith("touch") && !e.touches.length && e.type !== "touchend")
    return;

  const screenQuarter = Math.max(window.innerWidth, window.innerHeight) * 0.8;
  eyes.forEach((eye, i) => {
    const rect = eye.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const distFromEye = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const maxMove = 1.5; // in vh
    let dist = 0;
    if (distFromEye < screenQuarter) {
      // Only move for the portion beyond the threshold
      const excess = distFromEye - screenQuarter;
      // scale excess to maxMove at 1/4 screen further
      dist = 2; // Math.min(maxMove, (excess / screenQuarter) * maxMove);
    }
    const pupil = pupils[i];
    pupil.style.left = 1 + Math.cos(angle) * dist + "vh";
    pupil.style.top = 1 + Math.sin(angle) * dist + "vh";
  });
}

document.addEventListener("mousemove", movePupils);
document.addEventListener("touchmove", movePupils, { passive: true });
document.addEventListener("touchstart", movePupils, {
  passive: true,
});

let contractPupilsTimeout;
function contractPupils() {
  pupils.forEach((pupil) => {
    pupil.style.transform = "scale(0.5)";
  });
  clearTimeout(contractPupilsTimeout);
}
function resetEyes() {
  pupils.forEach((pupil) => {
    pupil.style.transform = "";
    pupil.style.left = "0.8vh";
    pupil.style.top = "0.8vh";
  });
}
function openEyes() {
  pupils.forEach((pupil) => {
    pupil.style.transform = "scaleY(1)";
  });
}
function blink() {
  pupils.forEach((pupil) => {
    pupil.style.transform = "scaleY(0.2)";
    setTimeout(openEyes, 300);
  });
}
document.addEventListener("mousedown", contractPupils);
document.addEventListener("mouseup", resetEyes);
document.addEventListener("mouseleave", resetEyes);
document.addEventListener("touchstart", contractPupils);
document.addEventListener("touchend", resetEyes);
// document.addEventListener("touchcancel", resetEyes);
setInterval(blink, 10000);

// Load projects from repos.json and create sidebar bars
async function loadProjects() {
  try {
    const response = await fetch(`repos.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const projects = await response.json();

    // Sort by priority (ascending - lower numbers first)
    projects.sort((a, b) => a.priority - b.priority);

    const sidebar = document.getElementById("projectSidebar");
    sidebar.innerHTML = ""; // Clear existing content

    projects.forEach((project, index) => {
      // Create project bar link
      const bar = document.createElement("a");
      bar.className = "project-bar";
      bar.href = project.link;
      bar.target = "_blank";
      bar.rel = "noopener noreferrer";
      bar.style.animationDelay = `${index * 0.15}s`;

      // Create title
      const title = document.createElement("div");
      title.className = "project-title";
      title.textContent = project.name;

      // Create languages container
      const languagesContainer = document.createElement("div");
      languagesContainer.className = "project-languages";

      // Add language tags
      project.languages.forEach((lang) => {
        const tag = document.createElement("span");
        tag.className = "language-tag";
        tag.textContent = lang;
        languagesContainer.appendChild(tag);
      });

      // Assemble the bar
      bar.appendChild(title);
      bar.appendChild(languagesContainer);
      sidebar.appendChild(bar);
    });
  } catch (error) {
    console.error("Error loading projects:", error);
    const sidebar = document.getElementById("projectSidebar");
    if (sidebar) {
      sidebar.innerHTML = `<div class="error-text">Failed to load projects.<br>${error.message}</div>`;
    }
  }
}

// Load projects when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadProjects);
} else {
  loadProjects();
}

// Fetch and display GitHub contribution graph for 3 years
async function loadGitHubActivity() {
  const cacheKey = "github_activity_local_cache";
  // Cache for 1 hour since we control the data generation now
  const cacheTimeout = 60 * 60 * 1000;

  try {
    // Check cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTimeout) {
        renderAllYears(data);
        return;
      }
    }

    // Fetch from local data.json
    const response = await fetch("data.json");
    if (!response.ok) {
      throw new Error("Failed to fetch data.json");
    }

    const fullData = await response.json();
    const commitData = fullData.gitCommits; // Array of { year, commits: [{date, count}] }

    // Cache the data
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: commitData,
        timestamp: Date.now(),
      })
    );

    renderAllYears(commitData);
  } catch (error) {
    console.error("Error loading GitHub activity:", error);
    // Show error in all grids
    ["2023", "2024", "2025", "2026"].forEach((year) => {
      const grid = document.getElementById(`grid-${year}`);
      if (grid) grid.innerHTML = '<div class="error-text">Failed</div>';
    });
  }
}

function renderAllYears(gitCommits) {
  // gitCommits is array of { year: "202X", commits: [...] }
  gitCommits.forEach((yearData) => {
    renderYearGrid(yearData.year, yearData.commits);
  });
}

function getContributionLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function renderYearGrid(year, contributions) {
  const grid = document.getElementById(`grid-${year}`);
  if (!grid) return;
  grid.innerHTML = "";

  // Sort contributions by date (should already be sorted but good to ensure)
  contributions.sort((a, b) => a.date.localeCompare(b.date));

  // We need to render 53 weeks (rows) x 7 days (cols)
  const cells = Array(53)
    .fill(null)
    .map(() => Array(7).fill(null));

  let weekIndex = 0;

  contributions.forEach((day, index) => {
    // Parse date as UTC
    const date = new Date(day.date);
    const dayOfWeek = date.getUTCDay(); // 0 (Sun) - 6 (Sat) using UTC

    if (dayOfWeek === 0 && index > 0) {
      weekIndex++;
    }

    if (weekIndex < 53) {
      cells[weekIndex][dayOfWeek] = day;
    }
  });

  // Now render the grid
  for (let w = 0; w < 53; w++) {
    for (let d = 0; d < 7; d++) {
      const dayData = cells[w][d];
      const cell = document.createElement("div");
      cell.className = "contribution-cell";

      if (dayData) {
        const level = getContributionLevel(dayData.count);
        cell.setAttribute("data-level", level);
        cell.title = `${dayData.date}: ${dayData.count} commit${
          dayData.count !== 1 ? "s" : ""
        }`;
      } else {
        // Empty cell (padding)
        cell.style.opacity = "0";
      }
      grid.appendChild(cell);
    }
  }
}
// Load when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadGitHubActivity);
} else {
  loadGitHubActivity();
}

// Theme Toggle Logic
const themeToggleBtn = document.getElementById("theme-toggle");
const sunIcon = document.querySelector(".sun-icon");
const moonIcon = document.querySelector(".moon-icon");

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  if (theme === "dark") {
    if (sunIcon) sunIcon.style.display = "block";
    if (moonIcon) moonIcon.style.display = "none";
  } else {
    if (sunIcon) sunIcon.style.display = "none";
    if (moonIcon) moonIcon.style.display = "block";
  }
}

function getPreferredTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    return savedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setTheme(getPreferredTheme());

  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      setTheme(currentTheme === "dark" ? "light" : "dark");
    });
  }
});
