import {
  isFirebaseReady,
  loginWithEmail,
  logoutUser,
  onAuthReady,
  signUpWithEmail,
} from "./firebase-auth.js";
import {
  getUserOnboarding,
  getUserWeekProgress,
  saveUserOnboarding,
  saveUserStudyProfile,
  saveWeek0Subgoals,
  saveUserWeek,
  getPostTestQuestions,
  savePostTest,
} from "./firebase-firestore.js";
import { baselineQuizQuestions } from "./onboarding-quiz.js";
import { delayedTestQuestionsByWeek } from "./delayed-test-questions.js";

const authShell = document.getElementById("auth-shell");
const onboardingShell = document.getElementById("onboarding-shell");
const onboardingTitle = document.getElementById("onboarding-title");
const onboardingSubtitle = document.getElementById("onboarding-subtitle");
const onboardingStepCount = document.getElementById("onboarding-step-count");
const onboardingProgressBar = document.getElementById("onboarding-progress-bar");
const onboardingContent = document.getElementById("onboarding-content");
const onboardingValidation = document.getElementById("onboarding-validation");
const onboardingBack = document.getElementById("onboarding-back");
const onboardingNext = document.getElementById("onboarding-next");
const dashboardShell = document.getElementById("dashboard-shell");
const dashboardUserName = document.getElementById("dashboard-user-name");
const dashboardProgressLabel = document.getElementById("dashboard-progress-label");
const dashboardProgressCaption = document.getElementById("dashboard-progress-caption");
const dashboardProgressFill = document.getElementById("dashboard-progress-fill");
const weekCardList = document.getElementById("week-card-list");
const dashboardLogoutButton = document.getElementById("dashboard-logout-button");
const weekShell = document.getElementById("week-shell");
const weekShellEyebrow = document.getElementById("week-shell-eyebrow");
const weekShellTitle = document.getElementById("week-shell-title");
const weekShellSubtitle = document.getElementById("week-shell-subtitle");
const weekShellContent = document.getElementById("week-shell-content");
const weekShellValidation = document.getElementById("week-shell-validation");
const weekShellBack = document.getElementById("week-shell-back");
const weekShellNext = document.getElementById("week-shell-next");
const appShell = document.getElementById("app-shell");
const postTestShell = document.getElementById("post-test-shell");
const postTestContent = document.getElementById("post-test-content");
const postTestValidation = document.getElementById("post-test-validation");
const postTestButton = document.getElementById("post-test-button");
const postTestBack = document.getElementById("post-test-back");
const postTestSubmit = document.getElementById("post-test-submit");
const authUserDisplay = document.getElementById("auth-user-display");
const loginTab = document.getElementById("login-tab");
const signupTab = document.getElementById("signup-tab");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmit = document.getElementById("auth-submit");
const authHelper = document.getElementById("auth-helper");
const authError = document.getElementById("auth-error");
const logoutButton = document.getElementById("logout-button");
const searchForm = document.getElementById("search-form");
const queryInput = document.getElementById("query-input");
const resultsContainer = document.getElementById("results");
const statusMessage = document.getElementById("status-message");
const userIdDisplay = document.getElementById("user-id-display");
const sessionIdDisplay = document.getElementById("session-id-display");
const summaryText = document.getElementById("summary-text");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const keywordList = document.getElementById("keyword-list");

let currentUserId = "demo-user";
const sessionId = crypto.randomUUID();
let currentQuery = "";
const chatHistory = [];
let pendingReturnContext = null;
let leftMainPageAt = null;
let returnLogged = false;
let authMode = "login";
const weekDefinitions = [
  { id: "week1", label: "Week 1" },
  { id: "week2", label: "Week 2" },
  { id: "week3", label: "Week 3" },
  { id: "week4", label: "Week 4" },
];
const onboardingSteps = [
  "welcome",
  "consent",
  "demographics",
  "quiz",
  "subgoals",
  "complete",
];
const onboardingState = {
  step: "welcome",
  completed: false,
  consentAgreed: false,
  demographics: {
    ageRange: "",
    primaryLanguage: "",
    educationLevel: "",
    searchEngineFamiliarity: "4",
    conversationalAiFamiliarity: "4",
    technologyUsageFrequency: "",
  },
  quizAnswers: {},
  subgoals: createDefaultSubgoals(),
};
const dashboardState = {
  assignedCondition: "Condition not assigned yet",
  currentWeek: "week1",
  weeks: createDefaultWeeks(),
};
const weekFlowState = {
  weekId: "",
  step: "",
  delayedTestAnswers: {},
  subgoals: createDefaultWeekSubgoals(),
  currentSessionIndex: 0,
  sessionTimeRemaining: 25 * 60,
};

if (sessionIdDisplay) {
  sessionIdDisplay.textContent = sessionId;
}
initializeInterface();

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const queryText = queryInput.value.trim();
  if (!queryText) {
    statusMessage.textContent = "Enter a search query first.";
    return;
  }

  currentQuery = queryText;
  statusMessage.textContent = "Searching...";
  resultsContainer.innerHTML = "";
  if (summaryText) {
    summaryText.textContent = "Generating a search summary...";
  }

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: currentUserId,
        session_id: sessionId,
        query_text: queryText,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Search request failed.");
    }

    renderResults(data.results);
    renderSummary(data.summary);
    renderKeywords(data.keywords || []);
    statusMessage.textContent = `Showing ${data.results.length} result(s) for "${queryText}".`;
  } catch (error) {
    renderEmptyState("The search could not be completed.");
    renderSummary(null);
    renderKeywords([]);
    statusMessage.textContent = error.message;
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();
  if (!message) {
    return;
  }

  appendChatMessage("user", message);
  chatHistory.push({ role: "user", content: message });
  chatInput.value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory,
        current_query: currentQuery,
        user_id: currentUserId,
        session_id: sessionId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Chat request failed.");
    }

    appendChatMessage("assistant", data.reply);
    chatHistory.push({ role: "assistant", content: data.reply });
  } catch (error) {
    appendChatMessage("assistant", `Chat error: ${error.message}`);
  }
});

document.addEventListener("visibilitychange", async () => {
  if (!pendingReturnContext) {
    return;
  }

  if (document.hidden) {
    leftMainPageAt = new Date();
    returnLogged = false;
    return;
  }

  if (!document.hidden) {
    await tryLogReturnEvent();
  }
});

window.addEventListener("focus", async () => {
  await tryLogReturnEvent();
});

loginTab.addEventListener("click", () => {
  setAuthMode("login");
});

signupTab.addEventListener("click", () => {
  setAuthMode("signup");
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authError.textContent = "";

  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    authError.textContent = "Email and password are required.";
    return;
  }

  try {
    let credential;
    if (authMode === "login") {
      credential = await loginWithEmail(email, password);
    } else {
      credential = await signUpWithEmail(email, password);
    }

    // Do the UI transition immediately after a successful auth call instead of
    // waiting only for the auth-state listener.
    if (credential && credential.user) {
      handleAuthenticatedUser(credential.user);
    }
  } catch (error) {
    console.error("Auth error:", error);
    authError.textContent = mapAuthError(error);
  }
});

logoutButton.addEventListener("click", async () => {
  await logoutUser();
});

dashboardLogoutButton.addEventListener("click", async () => {
  await logoutUser();
});

onboardingBack.addEventListener("click", async () => {
  const currentIndex = onboardingSteps.indexOf(onboardingState.step);
  if (currentIndex <= 0) {
    return;
  }

  setOnboardingStep(onboardingSteps[currentIndex - 1]);
  await persistOnboardingProgress();
});

onboardingNext.addEventListener("click", async () => {
  onboardingValidation.textContent = "";

  const validationError = readAndValidateCurrentStep();
  if (validationError) {
    onboardingValidation.textContent = validationError;
    return;
  }

  const currentIndex = onboardingSteps.indexOf(onboardingState.step);
  const isLastStep = currentIndex === onboardingSteps.length - 1;
  if (isLastStep) {
    await loadDashboardState();
    showDashboardView();
    return;
  }

  if (onboardingState.step === "subgoals") {
    onboardingState.completed = true;
    onboardingState.step = "complete";
    await persistOnboardingProgress();
    renderOnboardingStep();
    return;
  }

  setOnboardingStep(onboardingSteps[currentIndex + 1]);
  await persistOnboardingProgress();
});

weekShellBack.addEventListener("click", async () => {
  await loadDashboardState();
  showDashboardView();
});

weekShellNext.addEventListener("click", async () => {
  weekShellValidation.textContent = "";
  const validationError = readAndValidateWeekStep();
  if (validationError) {
    weekShellValidation.textContent = validationError;
    return;
  }

  await persistWeekFlowState();

  if (weekFlowState.step === "delayedTest") {
    weekFlowState.step = "subgoals";
    renderWeekFlowStep();
    return;
  }

  const currentWeek = dashboardState.weeks[weekFlowState.weekId];
  currentWeek.subgoalsCompleted = true;
  currentWeek.status = "in_progress";
  currentWeek.subgoals = weekFlowState.subgoals;
  dashboardState.currentWeek = getNextAvailableWeekId() || weekFlowState.weekId;

  await saveUserStudyProfile(currentUserId, {
    currentWeek: dashboardState.currentWeek,
    assignedCondition: dashboardState.assignedCondition,
    weekProgress: summarizeWeekProgress(),
  });
  const savedSubgoals = weekFlowState.subgoals;
  const savedWeekId = weekFlowState.weekId;
  resetWeekFlowState();
  weekFlowState.subgoals = savedSubgoals;
  weekFlowState.weekId = savedWeekId;
  weekFlowState.currentSessionIndex = 0;
  weekFlowState.sessionTimeRemaining = 25 * 60;
  showAppView();
});

onAuthReady((user) => {
  if (!user) {
    showAuthView();
    return;
  }

  void handleAuthenticatedUser(user);
});

function initializeInterface() {
  renderEmptyState("Submit a query to see results inside this page.");
  appendChatMessage(
    "assistant",
    "Ask a question here. After you search, I will also summarize the topic based on the returned results."
  );
  setAuthMode("login");

  if (!isFirebaseReady()) {
    authError.textContent =
      "Firebase is not configured yet. Add your Firebase web app settings to .env.";
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === "login";
  loginTab.classList.toggle("active", isLogin);
  signupTab.classList.toggle("active", !isLogin);
  authSubmit.textContent = isLogin ? "Log In" : "Create Account";
  authHelper.textContent = isLogin
    ? "Use an existing account to continue to the research page."
    : "Create a new account to access the research page.";
  authPassword.autocomplete = isLogin ? "current-password" : "new-password";
  authError.textContent = "";
}

function showAuthView() {
  resetOnboardingState();
  resetDashboardState();
  resetWeekFlowState();
  authShell.classList.remove("hidden");
  onboardingShell.classList.add("hidden");
  dashboardShell.classList.add("hidden");
  weekShell.classList.add("hidden");
  appShell.classList.add("hidden");
  authPassword.value = "";
  authEmail.value = "";
}

// ── Subgoal Sidebar ──────────────────────────────────────────────────────────

let sidebarExpanded = false;

function renderSubgoalSidebar() {
  const dotsContainer = document.getElementById("sidebar-dots");
  const listContainer = document.getElementById("sidebar-list");
  if (!dotsContainer || !listContainer) return;

  const subgoals = weekFlowState.subgoals;

  dotsContainer.innerHTML = subgoals
    .map(
      (goal, i) =>
        `<div class="sidebar-dot-wrap" title="${escapeHtml(goal.question || `Subgoal ${i + 1}`)}">
          <div class="sidebar-dot status-${goal.status || "not_started"}"></div>
        </div>`
    )
    .join("");

  listContainer.innerHTML = subgoals
    .map(
      (goal, i) => `
      <li class="sidebar-item">
        <div class="sidebar-item-dot status-${goal.status || "not_started"}"></div>
        <div class="sidebar-item-body">
          <span class="sidebar-item-text" data-index="${i}" contenteditable="false">${escapeHtml(goal.question || `Subgoal ${i + 1}`)}</span>
          <select class="sidebar-status-select" data-index="${i}">
            <option value="not_started" ${(goal.status || "not_started") === "not_started" ? "selected" : ""}>Not Started</option>
            <option value="in_progress" ${goal.status === "in_progress" ? "selected" : ""}>In Progress</option>
            <option value="completed" ${goal.status === "completed" ? "selected" : ""}>Completed</option>
          </select>
        </div>
      </li>`
    )
    .join("");

  listContainer.querySelectorAll(".sidebar-status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const idx = parseInt(e.target.dataset.index);
      const newStatus = e.target.value;
      weekFlowState.subgoals[idx].status = newStatus;
      renderSubgoalSidebar();
      if (currentUserId && weekFlowState.weekId) {
        await saveUserWeek(currentUserId, weekFlowState.weekId, {
          ...dashboardState.weeks[weekFlowState.weekId],
          subgoals: weekFlowState.subgoals,
        });
      }
      if (newStatus === "completed" && idx === weekFlowState.currentSessionIndex) {
        showMicroCheck(idx);
      }
    });
  });

  listContainer.querySelectorAll(".sidebar-item-text").forEach((span) => {
    span.addEventListener("click", (e) => {
      e.target.contentEditable = "true";
      e.target.focus();
    });
    span.addEventListener("blur", async (e) => {
      e.target.contentEditable = "false";
      const idx = parseInt(e.target.dataset.index);
      const newText = e.target.textContent.trim();
      weekFlowState.subgoals[idx].question = newText;
      if (currentUserId && weekFlowState.weekId) {
        await saveUserWeek(currentUserId, weekFlowState.weekId, {
          ...dashboardState.weeks[weekFlowState.weekId],
          subgoals: weekFlowState.subgoals,
        });
      }
    });
  });
}

function toggleSidebar() {
  sidebarExpanded = !sidebarExpanded;
  const sidebar = document.getElementById("subgoal-sidebar");
  const grid = document.getElementById("layout-grid");
  sidebar.classList.toggle("expanded", sidebarExpanded);
  grid.classList.toggle("sidebar-expanded", sidebarExpanded);
}

document.getElementById("sidebar-toggle").addEventListener("click", toggleSidebar);

// ── Session indicator ─────────────────────────────────────────────────────────

function renderSessionIndicator() {
  const el = document.getElementById("session-indicator");
  if (el) el.textContent = `Session ${weekFlowState.currentSessionIndex + 1} of 3`;
}

// ── Back to Dashboard ─────────────────────────────────────────────────────────

document.getElementById("back-to-dashboard-button").addEventListener("click", async () => {
  stopCountdown();
  if (weekFlowState.weekId) {
    const weekState = dashboardState.weeks[weekFlowState.weekId] || {};
    await saveUserWeek(currentUserId, weekFlowState.weekId, {
      ...weekState,
      subgoals: weekFlowState.subgoals,
      currentSessionIndex: weekFlowState.currentSessionIndex,
      sessionTimeRemaining: weekFlowState.sessionTimeRemaining,
      sessions: weekState.sessions || [null, null, null],
    });
  }
  await loadDashboardState();
  showDashboardView();
});

// ── Micro-Check ───────────────────────────────────────────────────────────────

function showMicroCheck(sessionIndex) {
  const overlay = document.getElementById("micro-check-overlay");
  const submit = document.getElementById("mc-submit");
  const error = document.getElementById("mc-error");
  if (!overlay) return;

  const isLast = sessionIndex >= 2;
  if (submit) submit.textContent = isLast ? "Finish Week" : "Continue to Next Session";
  if (error) error.textContent = "";

  // Reset form
  const form = document.getElementById("micro-check-form");
  if (form) form.reset();
  const progressVal = document.getElementById("mc-progress-value");
  if (progressVal) progressVal.textContent = "4";

  overlay.classList.remove("hidden");
}

function hideMicroCheck() {
  const overlay = document.getElementById("micro-check-overlay");
  if (overlay) overlay.classList.add("hidden");
}

// Sync range display
document.getElementById("mc-progress").addEventListener("input", (e) => {
  const el = document.getElementById("mc-progress-value");
  if (el) el.textContent = e.target.value;
});

document.getElementById("micro-check-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const tool = form.tool.value;
  const activity = form.activity.value;
  const progress = parseInt(form.progress.value);
  const error = document.getElementById("mc-error");

  if (!tool || !activity) {
    if (error) error.textContent = "Please answer all questions before continuing.";
    return;
  }
  if (error) error.textContent = "";

  const sessionIndex = weekFlowState.currentSessionIndex;
  const microCheck = { tool, activity, progress, completedAt: new Date().toISOString() };

  const weekState = dashboardState.weeks[weekFlowState.weekId] || {};
  const sessions = weekState.sessions ? [...weekState.sessions] : [null, null, null];
  sessions[sessionIndex] = microCheck;

  weekFlowState.currentSessionIndex = sessionIndex + 1;
  weekFlowState.sessionTimeRemaining = 25 * 60;

  dashboardState.weeks[weekFlowState.weekId] = {
    ...weekState,
    subgoals: weekFlowState.subgoals,
    currentSessionIndex: weekFlowState.currentSessionIndex,
    sessionTimeRemaining: weekFlowState.sessionTimeRemaining,
    sessions,
  };

  await saveUserWeek(currentUserId, weekFlowState.weekId, dashboardState.weeks[weekFlowState.weekId]);

  hideMicroCheck();

  if (weekFlowState.currentSessionIndex >= 3) {
    // All sessions done — mark week complete and return to dashboard
    dashboardState.weeks[weekFlowState.weekId] = {
      ...dashboardState.weeks[weekFlowState.weekId],
      status: "completed",
      sessionsCompleted: true,
    };
    await saveUserWeek(currentUserId, weekFlowState.weekId, dashboardState.weeks[weekFlowState.weekId]);
    await loadDashboardState();
    showDashboardView();
  } else {
    // Next session
    startCountdown(25 * 60);
    renderSessionIndicator();
    renderSubgoalSidebar();
  }
});

// ─────────────────────────────────────────────────────────────────────────────

let countdownInterval = null;

function startCountdown(initialSeconds) {
  if (countdownInterval) clearInterval(countdownInterval);
  const total = 25 * 60;
  let remaining = initialSeconds !== undefined ? initialSeconds : total;
  weekFlowState.sessionTimeRemaining = remaining;
  const bar = document.getElementById("countdown-bar");
  const label = document.getElementById("countdown-label");
  function tick() {
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    if (label) label.textContent = `${m}:${s}`;
    if (bar) bar.style.setProperty("--progress", remaining / total);
    weekFlowState.sessionTimeRemaining = remaining;
    if (remaining <= 0) clearInterval(countdownInterval);
    remaining--;
  }
  tick();
  countdownInterval = setInterval(tick, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function showAppView() {
  authShell.classList.add("hidden");
  onboardingShell.classList.add("hidden");
  dashboardShell.classList.add("hidden");
  weekShell.classList.add("hidden");
  appShell.classList.remove("hidden");
  startCountdown(weekFlowState.sessionTimeRemaining);
  renderSubgoalSidebar();
  renderSessionIndicator();
}

function showOnboardingView() {
  authShell.classList.add("hidden");
  onboardingShell.classList.remove("hidden");
  dashboardShell.classList.add("hidden");
  weekShell.classList.add("hidden");
  appShell.classList.add("hidden");
}

function showDashboardView() {
  authShell.classList.add("hidden");
  onboardingShell.classList.add("hidden");
  dashboardShell.classList.remove("hidden");
  weekShell.classList.add("hidden");
  appShell.classList.add("hidden");
  postTestShell.classList.add("hidden");
  renderDashboard();
}

function showPostTestView() {
  authShell.classList.add("hidden");
  onboardingShell.classList.add("hidden");
  dashboardShell.classList.add("hidden");
  weekShell.classList.add("hidden");
  appShell.classList.add("hidden");
  postTestShell.classList.remove("hidden");
}

function showWeekShellView() {
  authShell.classList.add("hidden");
  onboardingShell.classList.add("hidden");
  dashboardShell.classList.add("hidden");
  weekShell.classList.remove("hidden");
  appShell.classList.add("hidden");
}

async function handleAuthenticatedUser(user) {
  resetOnboardingState();
  resetDashboardState();
  resetWeekFlowState();
  currentUserId = user.uid;
  if (userIdDisplay) {
    userIdDisplay.textContent = currentUserId;
  }
  authUserDisplay.textContent = user.email || user.uid;
  authError.textContent = "";

  try {
    const savedData = await getUserOnboarding(user.uid);
    mergeOnboardingState(savedData.profile || {}, savedData.subgoals || {});
  } catch (error) {
    console.error("Onboarding load error:", error);
  }

  if (onboardingState.completed) {
    await loadDashboardState();
    showDashboardView();
    return;
  }

  showOnboardingView();
  renderOnboardingStep();
}

async function loadDashboardState() {
  try {
    const [onboardingData, weekData] = await Promise.all([
      getUserOnboarding(currentUserId),
      getUserWeekProgress(currentUserId),
    ]);

    dashboardState.assignedCondition =
      onboardingData.profile.assignedCondition || "Condition not assigned yet";
    dashboardState.currentWeek = onboardingData.profile.currentWeek || inferCurrentWeek(weekData);
    dashboardState.weeks = createDefaultWeeks();

    weekDefinitions.forEach((week) => {
      dashboardState.weeks[week.id] = {
        ...dashboardState.weeks[week.id],
        ...(weekData[week.id] || {}),
      };
    });
  } catch (error) {
    console.error("Dashboard load error:", error);
    dashboardState.assignedCondition = "Condition not assigned yet";
    dashboardState.currentWeek = "week1";
    dashboardState.weeks = createDefaultWeeks();
  }
}

function renderDashboard() {
  const completedWeeks = countCompletedWeeks();
  const allDone = completedWeeks === weekDefinitions.length;
  const nextWeekId = getNextAvailableWeekId();
  dashboardUserName.textContent = authUserDisplay.textContent || currentUserId;
  dashboardProgressLabel.textContent = `${completedWeeks} of ${weekDefinitions.length} weeks completed`;
  dashboardProgressCaption.textContent = nextWeekId
    ? `Current week: ${formatWeekLabel(nextWeekId)}`
    : "All study weeks are completed";
  dashboardProgressFill.style.width = `${(completedWeeks / weekDefinitions.length) * 100}%`;

  weekCardList.innerHTML = weekDefinitions
    .map((week) => {
      const weekState = dashboardState.weeks[week.id];
      const action = getWeekAction(week.id, weekState);

      return `
        <article class="week-entry-card">
          <span class="week-entry-status">${escapeHtml(action.statusLabel)}</span>
          <h3>${escapeHtml(week.label)}</h3>
          <p class="week-entry-meta">
            ${escapeHtml(action.description)}
          </p>
          <button
            class="week-entry-action ${action.completed ? "completed" : ""} ${action.locked ? "locked" : ""}"
            type="button"
            data-week-action="${week.id}"
            ${action.completed || action.locked ? "disabled" : ""}
          >
            ${escapeHtml(action.buttonLabel)}
          </button>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-week-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const weekId = button.getAttribute("data-week-action");
      await openWeekFlow(weekId);
    });
  });

  postTestButton.disabled = !allDone;
  postTestButton.textContent = allDone ? "Start Post-Test" : "Complete all 4 weeks to unlock";
  const desc = postTestButton.previousElementSibling;
  if (desc) {
    desc.textContent = allDone
      ? "All weeks complete. You may now take the overall post-test."
      : "Complete all four weeks before taking the overall post-test.";
  }
}

// ── Post-Test ────────────────────────────────────────────────────────────────

postTestButton.addEventListener("click", async () => {
  showPostTestView();
  postTestValidation.textContent = "";
  postTestContent.innerHTML = '<p style="color:var(--muted)">Loading questions…</p>';
  try {
    const questions = await getPostTestQuestions();
    renderPostTestForm(questions);
  } catch {
    postTestContent.innerHTML = '<p style="color:#e53e3e">Failed to load questions. Please try again.</p>';
  }
});

postTestBack.addEventListener("click", () => {
  showDashboardView();
});

postTestSubmit.addEventListener("click", async () => {
  postTestValidation.textContent = "";
  const inputs = postTestContent.querySelectorAll("input, textarea, select");
  const answers = {};
  let allAnswered = true;

  inputs.forEach((input) => {
    if (input.type === "radio") {
      if (input.checked) answers[input.name] = input.value;
    } else {
      answers[input.name] = input.value.trim();
      if (!input.value.trim()) allAnswered = false;
    }
  });

  const radioNames = [...new Set([...postTestContent.querySelectorAll("input[type=radio]")].map((r) => r.name))];
  radioNames.forEach((name) => { if (!answers[name]) allAnswered = false; });

  if (!allAnswered) {
    postTestValidation.textContent = "Please answer all questions before submitting.";
    return;
  }

  postTestSubmit.disabled = true;
  postTestSubmit.textContent = "Submitting…";
  try {
    await savePostTest(currentUserId, answers);
    postTestContent.innerHTML = '<p style="font-weight:700;color:var(--accent-dark)">Post-test submitted. Thank you!</p>';
    postTestValidation.textContent = "";
    postTestSubmit.classList.add("hidden");
  } catch {
    postTestValidation.textContent = "Submission failed. Please try again.";
    postTestSubmit.disabled = false;
    postTestSubmit.textContent = "Submit Post-Test";
  }
});

function renderPostTestForm(questions) {
  if (!questions.length) {
    postTestContent.innerHTML = '<p style="color:var(--muted)">No questions available yet.</p>';
    return;
  }

  postTestContent.innerHTML = questions
    .map((q, i) => {
      const num = i + 1;
      if (q.type === "multiple_choice" && Array.isArray(q.options)) {
        return `
          <div class="quiz-question-card">
            <p class="quiz-question-text"><strong>${num}.</strong> ${escapeHtml(q.text)}</p>
            <div class="quiz-options">
              ${q.options.map((opt) => `
                <label class="quiz-option-label">
                  <input type="radio" name="q_${q.id}" value="${escapeHtml(opt)}" required />
                  ${escapeHtml(opt)}
                </label>`).join("")}
            </div>
          </div>`;
      }
      if (q.type === "short_answer") {
        return `
          <div class="quiz-question-card">
            <p class="quiz-question-text"><strong>${num}.</strong> ${escapeHtml(q.text)}</p>
            <textarea name="q_${q.id}" rows="3" class="quiz-textarea" placeholder="Your answer…"></textarea>
          </div>`;
      }
      return "";
    })
    .join("");
}

async function openWeekFlow(weekId) {
  const weekState = dashboardState.weeks[weekId];

  if (isWeekComplete(weekState) || !isWeekUnlocked(weekId)) {
    return;
  }

  if (weekState.subgoalsCompleted && weekState.status === "in_progress") {
    dashboardState.currentWeek = weekId;
    weekFlowState.weekId = weekId;
    weekFlowState.subgoals =
      weekState.subgoals && weekState.subgoals.length === 3
        ? weekState.subgoals
        : createDefaultWeekSubgoals();
    weekFlowState.currentSessionIndex = weekState.currentSessionIndex ?? 0;
    weekFlowState.sessionTimeRemaining = weekState.sessionTimeRemaining ?? 25 * 60;
    await saveUserStudyProfile(currentUserId, {
      currentWeek: dashboardState.currentWeek,
      assignedCondition: dashboardState.assignedCondition,
      weekProgress: summarizeWeekProgress(),
    });
    showAppView();
    return;
  }

  weekFlowState.weekId = weekId;
  weekFlowState.delayedTestAnswers = weekState.delayedTestAnswers || {};
  weekFlowState.subgoals =
    weekState.subgoals && weekState.subgoals.length === 3
      ? weekState.subgoals
      : createDefaultWeekSubgoals();
  weekFlowState.step =
    weekId === "week1" || weekState.delayedTestCompleted ? "subgoals" : "delayedTest";

  const nextStatus = weekState.sessionsCompleted ? "completed" : "in_progress";
  dashboardState.weeks[weekId] = {
    ...weekState,
    status: nextStatus,
    startedAt: weekState.startedAt || new Date().toISOString(),
  };
  dashboardState.currentWeek = weekId;

  await saveUserWeek(currentUserId, weekId, {
    ...dashboardState.weeks[weekId],
    delayedTestCompleted: Boolean(weekState.delayedTestCompleted),
    subgoalsCompleted: Boolean(weekState.subgoalsCompleted),
    delayedTestAnswers: weekFlowState.delayedTestAnswers,
    subgoals: weekFlowState.subgoals,
  });
  await saveUserStudyProfile(currentUserId, {
    currentWeek: dashboardState.currentWeek,
    assignedCondition: dashboardState.assignedCondition,
    weekProgress: summarizeWeekProgress(),
  });

  showWeekShellView();
  renderWeekFlowStep();
}

function renderWeekFlowStep() {
  const weekLabel = formatWeekLabel(weekFlowState.weekId);
  const weekState = dashboardState.weeks[weekFlowState.weekId];
  weekShellEyebrow.textContent = weekLabel;
  weekShellValidation.textContent = "";

  if (weekFlowState.step === "delayedTest") {
    weekShellTitle.textContent = `Short Delayed Test`;
    weekShellSubtitle.textContent =
      " ";
    weekShellNext.textContent = "Submit Delayed Test";
    weekShellContent.innerHTML = `
      <section class="onboarding-section">
        <p class="inline-note">
          ${escapeHtml(weekLabel)} starts with a short delayed test before sub-goal planning.
        </p>
        <div class="quiz-list">
          ${getDelayedTestQuestions(weekFlowState.weekId)
            .map((question, index) => renderDelayedQuestionCard(question, index))
            .join("")}
        </div>
      </section>
    `;
    return;
  }

  weekShellTitle.textContent = `Sub-goal Planning`;
  weekShellSubtitle.textContent =
    weekFlowState.weekId === "week1"
      ? ""
      : "";
  weekShellNext.textContent = "Save Sub-goals and Continue";
  weekShellContent.innerHTML = `
    <section class="onboarding-section">
      <div class="subgoal-list">
        ${weekFlowState.subgoals
          .map(
            (goal, index) => `
              <article class="subgoal-card">
                <!-- <h3>${escapeHtml(weekLabel)} Sub-goal ${index + 1}</h3> -->
                <div class="form-grid">
                  <div class="field-group full-width">
                    <label for="weekly-goal-question-${index}">Sub-goal question</label>
                    <input
                      id="weekly-goal-question-${index}"
                      type="text"
                      value="${escapeHtml(goal.question)}"
                      placeholder="What do you want to focus on this week?"
                    />
                  </div>
                  <div class="field-group">
                    <label for="weekly-goal-type-${index}">Goal type</label>
                    <select id="weekly-goal-type-${index}">
                      ${renderSelectOptions(
                        ["Concept", "Evidence", "Comparison", "Application"],
                        goal.type
                      )}
                    </select>
                  </div>
                  <div class="field-group">
                    <label for="weekly-goal-importance-${index}">Importance</label>
                    <input
                      id="weekly-goal-importance-${index}"
                      type="range"
                      min="1"
                      max="7"
                      value="${escapeHtml(goal.importance)}"
                    />
                    <span class="scale-value">Current value: <strong id="weekly-goal-importance-value-${index}">${escapeHtml(
                      goal.importance
                    )}</strong> / 7</span>
                  </div>
                  <div class="field-group full-width">
                    <label for="weekly-goal-confidence-${index}">Confidence</label>
                    <input
                      id="weekly-goal-confidence-${index}"
                      type="range"
                      min="1"
                      max="7"
                      value="${escapeHtml(goal.confidence)}"
                    />
                    <span class="scale-value">Current value: <strong id="weekly-goal-confidence-value-${index}">${escapeHtml(
                      goal.confidence
                    )}</strong> / 7</span>
                  </div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;

  weekFlowState.subgoals.forEach((_, index) => {
    attachScaleMirror(`weekly-goal-importance-${index}`, `weekly-goal-importance-value-${index}`);
    attachScaleMirror(`weekly-goal-confidence-${index}`, `weekly-goal-confidence-value-${index}`);
  });
}

function renderDelayedQuestionCard(question, index) {
  if (question.type === "shortAnswer") {
    return `
      <article class="question-card">
        <h3>Question ${index + 1}</h3>
        <p class="onboarding-copy">${escapeHtml(question.prompt)}</p>
        <div class="field-group full-width">
          <label for="${question.id}">Short answer</label>
          <textarea id="${question.id}" placeholder="Type your response here...">${escapeHtml(
            weekFlowState.delayedTestAnswers[question.id] || ""
          )}</textarea>
        </div>
      </article>
    `;
  }

  return `
    <article class="question-card">
      <h3>Question ${index + 1}</h3>
      <p class="onboarding-copy">${escapeHtml(question.prompt)}</p>
      <div class="option-list">
        ${question.options
          .map(
            (option) => `
              <label>
                <input
                  type="radio"
                  name="${question.id}"
                  value="${escapeHtml(option)}"
                  ${
                    weekFlowState.delayedTestAnswers[question.id] === option ? "checked" : ""
                  }
                />
                ${escapeHtml(option)}
              </label>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderResults(results) {
  if (!results.length) {
    renderEmptyState("No results were returned for this query.");
    return;
  }

  resultsContainer.innerHTML = "";

  results.forEach((result) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const link = document.createElement("a");
    link.className = "result-link";
    link.href = result.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = result.title;

    link.addEventListener("click", async (event) => {
      event.preventDefault();

      try {
        await logClickEvent({
          user_id: currentUserId,
          session_id: sessionId,
          query_text: currentQuery,
          clicked_url: result.url,
          clicked_rank: result.rank,
        });
        pendingReturnContext = {
          query_text: currentQuery,
          clicked_url: result.url,
          clicked_rank: result.rank,
        };
        leftMainPageAt = null;
        returnLogged = false;
      } catch (error) {
        console.error("Click log failed:", error);
      } finally {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    });

    const url = document.createElement("p");
    url.className = "result-url";
    url.textContent = result.url;

    const snippet = document.createElement("p");
    snippet.className = "result-snippet";
    snippet.textContent = result.snippet;

    card.appendChild(link);
    card.appendChild(url);
    card.appendChild(snippet);
    resultsContainer.appendChild(card);
  });
}

function renderSummary(summary) {
  if (!summaryText) {
    return;
  }

  if (!summary) {
    summaryText.textContent =
      "No Groq summary is available yet. Add GROQ_API_KEY to enable automatic summaries.";
    return;
  }

  const words = summary.trim().split(/\s+/);
  summaryText.textContent = words.length > 150 ? words.slice(0, 150).join(" ") + "…" : summary;
}

function renderKeywords(keywords) {
  if (!keywords.length) {
    keywordList.innerHTML =
      '<span class="keyword-empty">No keywords available yet.</span>';
    return;
  }

  keywordList.innerHTML = "";

  keywords.forEach((keyword) => {
    const chip = document.createElement("span");
    chip.className = "keyword-chip";
    chip.textContent = keyword;
    keywordList.appendChild(chip);
  });
}

async function logClickEvent(payload) {
  const response = await fetch("/api/click", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Click log request failed.");
  }
}

async function tryLogReturnEvent() {
  if (!pendingReturnContext || !leftMainPageAt || returnLogged) {
    return;
  }

  const returnedAt = new Date();
  const timeAwayMs = returnedAt.getTime() - leftMainPageAt.getTime();

  if (timeAwayMs < 0) {
    return;
  }

  try {
    await fetch("/api/return", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: currentUserId,
        session_id: sessionId,
        query_text: pendingReturnContext.query_text,
        clicked_url: pendingReturnContext.clicked_url,
        clicked_rank: pendingReturnContext.clicked_rank,
        left_main_page_at: leftMainPageAt.toISOString(),
        returned_to_main_page_at: returnedAt.toISOString(),
        time_away_ms: timeAwayMs,
      }),
    });

    returnLogged = true;
    pendingReturnContext = null;
    leftMainPageAt = null;
  } catch (error) {
    console.error("Return log failed:", error);
  }
}

function renderEmptyState(message) {
  resultsContainer.innerHTML = `<div class="empty-state">${message}</div>`;
}

function appendChatMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function mapAuthError(error) {
  const code = error && error.code ? error.code : "";

  if (code === "auth/email-already-in-use") {
    return "This email is already registered. Try logging in instead.";
  }

  if (code === "auth/invalid-email") {
    return "Enter a valid email address.";
  }

  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "The email or password is incorrect.";
  }

  if (code === "auth/user-not-found") {
    return "No account was found for this email.";
  }

  if (code === "auth/weak-password") {
    return "Password is too weak. Use at least 6 characters.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please wait and try again.";
  }

  return error && error.message ? error.message : "Authentication failed.";
}

function mergeOnboardingState(profile, subgoalDoc) {
  onboardingState.completed = Boolean(profile.onboardingCompleted);
  onboardingState.step =
    onboardingSteps.includes(profile.onboardingStep) && !profile.onboardingCompleted
      ? profile.onboardingStep
      : profile.onboardingCompleted
        ? "complete"
        : "welcome";

  onboardingState.consentAgreed = Boolean(profile.consentAgreed);
  onboardingState.demographics = {
    ...onboardingState.demographics,
    ...(profile.demographics || {}),
  };
  onboardingState.quizAnswers = profile.baselineQuizAnswers || {};

  if (subgoalDoc.goal1 || subgoalDoc.goal2 || subgoalDoc.goal3) {
    onboardingState.subgoals = [
      subgoalDoc.goal1 || createDefaultSubgoal(1),
      subgoalDoc.goal2 || createDefaultSubgoal(2),
      subgoalDoc.goal3 || createDefaultSubgoal(3),
    ];
  }
}

function renderOnboardingStep() {
  const step = onboardingState.step;
  const stepIndex = onboardingSteps.indexOf(step);
  onboardingStepCount.textContent = `Step ${stepIndex + 1} of ${onboardingSteps.length}`;
  onboardingProgressBar.style.width = `${((stepIndex + 1) / onboardingSteps.length) * 100}%`;
  onboardingValidation.textContent = "";
  onboardingBack.disabled = step === "welcome";

  if (step === "welcome") {
    onboardingTitle.textContent = "Welcome to Week 0";
    onboardingSubtitle.textContent =
      "This onboarding module introduces the study, collects setup information, and prepares your first learning plan.";
    onboardingNext.textContent = "Start Onboarding";
    onboardingContent.innerHTML = `
      <section class="onboarding-section">
        <div class="onboarding-panel">
          <p class="onboarding-copy">
            Week 0 is the setup and preparation phase for this longitudinal learning study.
            You will review a consent placeholder, complete a short background form, preview the
            baseline quiz framework, and define three initial sub-goals for the next phase.
          </p>
        </div>
      </section>
    `;
    return;
  }

  if (step === "consent") {
    onboardingTitle.textContent = "Consent Placeholder";
    onboardingSubtitle.textContent =
      "Users must acknowledge participation before continuing. Replace this text with your approved consent form later.";
    onboardingNext.textContent = "Continue";
    onboardingContent.innerHTML = `
      <section class="onboarding-section">
        <div class="onboarding-panel consent-box">
          <p class="onboarding-copy">
            Placeholder study consent text. 
          </p>
          <p class="onboarding-copy">
            Placeholder privacy and participation statement. 
          </p>
        </div>
        <label class="consent-check">
          <input id="consent-agree" type="checkbox" ${onboardingState.consentAgreed ? "checked" : ""} />
          <span>I agree to participate in this research study.</span>
        </label>
      </section>
    `;
    return;
  }

  if (step === "demographics") {
    onboardingTitle.textContent = "Basic Demographics";
    onboardingSubtitle.textContent =
      "This information supports participant profiling for the study and can be resumed later.";
    onboardingNext.textContent = "Save and Continue";
    onboardingContent.innerHTML = `
      <section class="onboarding-section">
        <div class="form-grid">
          <div class="field-group">
            <label for="age-range">Age range</label>
            <select id="age-range">
              ${renderSelectOptions(
                [
                  "",
                  "18-24",
                  "25-34",
                  "35-44",
                  "45-54",
                  "55-64",
                  "65+",
                ],
                onboardingState.demographics.ageRange,
                "Select age range"
              )}
            </select>
          </div>
          <div class="field-group">
            <label for="education-level">Education level</label>
            <select id="education-level">
              ${renderSelectOptions(
                [
                  "",
                  "High school",
                  "Some college",
                  "Bachelor's degree",
                  "Master's degree",
                  "Doctoral degree",
                  "Other",
                ],
                onboardingState.demographics.educationLevel,
                "Select education level"
              )}
            </select>
          </div>
          <div class="field-group full-width">
            <label for="primary-language">Primary language</label>
            <input id="primary-language" type="text" value="${escapeHtml(
              onboardingState.demographics.primaryLanguage
            )}" placeholder="e.g. English" />
          </div>
          <div class="field-group full-width">
            <label for="search-engine-familiarity">Familiarity with search engines</label>
            <input
              id="search-engine-familiarity"
              type="range"
              min="1"
              max="7"
              value="${escapeHtml(onboardingState.demographics.searchEngineFamiliarity)}"
            />
            <span class="scale-value">Current value: <strong id="search-engine-familiarity-value">${escapeHtml(
              onboardingState.demographics.searchEngineFamiliarity
            )}</strong> / 7</span>
          </div>
          <div class="field-group full-width">
            <label for="conversational-ai-familiarity">Familiarity with conversational AI tools (e.g., ChatGPT)</label>
            <input
              id="conversational-ai-familiarity"
              type="range"
              min="1"
              max="7"
              value="${escapeHtml(onboardingState.demographics.conversationalAiFamiliarity)}"
            />
            <span class="scale-value">Current value: <strong id="conversational-ai-familiarity-value">${escapeHtml(
              onboardingState.demographics.conversationalAiFamiliarity
            )}</strong> / 7</span>
          </div>
          <div class="field-group full-width">
            <label for="technology-usage-frequency">Technology familiarity and usage: frequency of use</label>
            <select id="technology-usage-frequency">
              ${renderSelectOptions(
                ["", "Daily", "Weekly", "Monthly", "Rarely"],
                onboardingState.demographics.technologyUsageFrequency,
                "Select frequency of use"
              )}
            </select>
          </div>
        </div>
      </section>
    `;

    attachScaleMirror("search-engine-familiarity", "search-engine-familiarity-value");
    attachScaleMirror(
      "conversational-ai-familiarity",
      "conversational-ai-familiarity-value"
    );
    return;
  }

  if (step === "quiz") {
    onboardingTitle.textContent = "Baseline Knowledge Test";
    onboardingSubtitle.textContent =
      "This is the framework only. The real study questions can be loaded later from Firestore.";
    onboardingNext.textContent = "Save and Continue";
    onboardingContent.innerHTML = `
      <section class="onboarding-section">
        <p class="inline-note">
          Placeholder responses are collected only to preserve the future quiz structure.
        </p>
        <div class="quiz-list">
          ${baselineQuizQuestions
            .map(
              (question, index) => `
                <article class="quiz-card">
                  <h3>Question ${index + 1}</h3>
                  <p class="onboarding-copy">${escapeHtml(question.prompt)}</p>
                  <div class="option-list">
                    ${question.options
                      .map(
                        (option) => `
                          <label>
                            <input
                              type="radio"
                              name="${question.id}"
                              value="${escapeHtml(option)}"
                              ${
                                onboardingState.quizAnswers[question.id] === option ? "checked" : ""
                              }
                            />
                            ${escapeHtml(option)}
                          </label>
                        `
                      )
                      .join("")}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
    return;
  }

  if (step === "subgoals") {
    onboardingTitle.textContent = "Initial Sub-goal Planning";
    onboardingSubtitle.textContent =
      "Define exactly three sub-goals for the next learning phase. These will be stored in Firestore.";
    onboardingNext.textContent = "Submit Week 0";
    onboardingContent.innerHTML = `
      <section class="onboarding-section">
        <div class="subgoal-list">
          ${onboardingState.subgoals
            .map(
              (goal, index) => `
                <article class="subgoal-card">
                  <h3>Sub-goal ${index + 1}</h3>
                  <div class="form-grid">
                    <div class="field-group full-width">
                      <label for="goal-question-${index}">Goal question</label>
                      <input
                        id="goal-question-${index}"
                        type="text"
                        value="${escapeHtml(goal.question)}"
                        placeholder="What do you want to understand or achieve?"
                      />
                    </div>
                    <div class="field-group">
                      <label for="goal-type-${index}">Goal type</label>
                      <select id="goal-type-${index}">
                        ${renderSelectOptions(
                          ["Concept", "Evidence", "Comparison", "Application"],
                          goal.type
                        )}
                      </select>
                    </div>
                    <div class="field-group">
                      <label for="goal-importance-${index}">Importance</label>
                      <input
                        id="goal-importance-${index}"
                        type="range"
                        min="1"
                        max="7"
                        value="${escapeHtml(goal.importance)}"
                      />
                      <span class="scale-value">Current value: <strong id="goal-importance-value-${index}">${escapeHtml(
                        goal.importance
                      )}</strong> / 7</span>
                    </div>
                    <div class="field-group full-width">
                      <label for="goal-confidence-${index}">Confidence</label>
                      <input
                        id="goal-confidence-${index}"
                        type="range"
                        min="1"
                        max="7"
                        value="${escapeHtml(goal.confidence)}"
                      />
                      <span class="scale-value">Current value: <strong id="goal-confidence-value-${index}">${escapeHtml(
                        goal.confidence
                      )}</strong> / 7</span>
                    </div>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;

    onboardingState.subgoals.forEach((_, index) => {
      attachScaleMirror(`goal-importance-${index}`, `goal-importance-value-${index}`);
      attachScaleMirror(`goal-confidence-${index}`, `goal-confidence-value-${index}`);
    });
    return;
  }

  onboardingTitle.textContent = "Week 0 Completed";
  onboardingSubtitle.textContent =
    "Your setup data has been saved. You can now continue to the main research dashboard.";
  onboardingNext.textContent = "Continue to Dashboard";
  onboardingContent.innerHTML = `
    <section class="onboarding-section">
      <span class="completion-highlight">Week 0 completed</span>
      <div class="onboarding-panel">
        <p class="onboarding-copy">
          Thank you for completing the onboarding phase. Your consent response, demographic profile,
          baseline framework data, and initial sub-goals have been stored for the next stage.
        </p>
      </div>
    </section>
  `;
}

function readAndValidateCurrentStep() {
  if (onboardingState.step === "welcome") {
    return "";
  }

  if (onboardingState.step === "consent") {
    onboardingState.consentAgreed = Boolean(
      document.getElementById("consent-agree") &&
        document.getElementById("consent-agree").checked
    );
    return onboardingState.consentAgreed
      ? ""
      : "You must agree to participate before continuing.";
  }

  if (onboardingState.step === "demographics") {
    onboardingState.demographics = {
      ageRange: document.getElementById("age-range").value,
      primaryLanguage: document.getElementById("primary-language").value.trim(),
      educationLevel: document.getElementById("education-level").value,
      searchEngineFamiliarity: document.getElementById("search-engine-familiarity").value,
      conversationalAiFamiliarity: document.getElementById(
        "conversational-ai-familiarity"
      ).value,
      technologyUsageFrequency: document.getElementById("technology-usage-frequency").value,
    };

    if (
      !onboardingState.demographics.ageRange ||
      !onboardingState.demographics.primaryLanguage ||
      !onboardingState.demographics.educationLevel ||
      !onboardingState.demographics.technologyUsageFrequency
    ) {
      return "Please complete all required demographic fields.";
    }
    return "";
  }

  if (onboardingState.step === "quiz") {
    const answers = {};
    baselineQuizQuestions.forEach((question) => {
      const selected = document.querySelector(`input[name="${question.id}"]:checked`);
      answers[question.id] = selected ? selected.value : "";
    });
    onboardingState.quizAnswers = answers;
    return "";
  }

  if (onboardingState.step === "subgoals") {
    const nextGoals = onboardingState.subgoals.map((goal, index) => ({
      question: document.getElementById(`goal-question-${index}`).value.trim(),
      type: document.getElementById(`goal-type-${index}`).value,
      importance: document.getElementById(`goal-importance-${index}`).value,
      confidence: document.getElementById(`goal-confidence-${index}`).value,
    }));

    const incompleteGoal = nextGoals.find((goal) => !goal.question || !goal.type);
    if (incompleteGoal) {
      return "Please complete all three sub-goal entries before submitting Week 0.";
    }

    onboardingState.subgoals = nextGoals;
    return "";
  }

  return "";
}

async function persistOnboardingProgress() {
  const userDocPayload = {
    onboardingCompleted: onboardingState.completed,
    onboardingStep: onboardingState.step,
    consentAgreed: onboardingState.consentAgreed,
    demographics: onboardingState.demographics,
    baselineQuizAnswers: onboardingState.quizAnswers,
  };

  await saveUserOnboarding(currentUserId, userDocPayload);

  if (onboardingState.subgoals.length === 3) {
    await saveWeek0Subgoals(currentUserId, onboardingState.subgoals);
  }
}

function readAndValidateWeekStep() {
  if (weekFlowState.step === "delayedTest") {
    const answers = {};
    const questions = getDelayedTestQuestions(weekFlowState.weekId);

    for (const question of questions) {
      if (question.type === "shortAnswer") {
        const value = document.getElementById(question.id).value.trim();
        if (!value) {
          return "Please answer all delayed-test questions before continuing.";
        }
        answers[question.id] = value;
        continue;
      }

      const selected = document.querySelector(`input[name="${question.id}"]:checked`);
      if (!selected) {
        return "Please answer all delayed-test questions before continuing.";
      }
      answers[question.id] = selected.value;
    }

    weekFlowState.delayedTestAnswers = answers;
    return "";
  }

  const nextGoals = weekFlowState.subgoals.map((goal, index) => ({
    question: document.getElementById(`weekly-goal-question-${index}`).value.trim(),
    type: document.getElementById(`weekly-goal-type-${index}`).value,
    importance: document.getElementById(`weekly-goal-importance-${index}`).value,
    confidence: document.getElementById(`weekly-goal-confidence-${index}`).value,
  }));

  const incompleteGoal = nextGoals.find((goal) => !goal.question || !goal.type);
  if (incompleteGoal) {
    return "Please complete all three weekly sub-goals before continuing.";
  }

  weekFlowState.subgoals = nextGoals;
  return "";
}

async function persistWeekFlowState() {
  const weekId = weekFlowState.weekId;
  const currentWeek = dashboardState.weeks[weekId];
  const payload = {
    ...currentWeek,
    delayedTestCompleted:
      weekId === "week1" ? true : weekFlowState.step === "delayedTest" || currentWeek.delayedTestCompleted,
    subgoalsCompleted: weekFlowState.step === "subgoals",
    delayedTestAnswers:
      weekId === "week1" ? {} : weekFlowState.delayedTestAnswers,
    subgoals: weekFlowState.subgoals,
  };

  if (weekFlowState.step === "delayedTest") {
    payload.delayedTestCompleted = true;
    payload.subgoalsCompleted = false;
  }

  if (weekFlowState.step === "subgoals") {
    payload.delayedTestCompleted = weekId === "week1" ? true : true;
    payload.subgoalsCompleted = true;
  }

  dashboardState.weeks[weekId] = payload;

  await saveUserWeek(currentUserId, weekId, payload);
}

function setOnboardingStep(step) {
  onboardingState.step = step;
  renderOnboardingStep();
}

function attachScaleMirror(inputId, valueId) {
  const input = document.getElementById(inputId);
  const value = document.getElementById(valueId);
  if (!input || !value) {
    return;
  }

  input.addEventListener("input", () => {
    value.textContent = input.value;
  });
}

function renderSelectOptions(options, selectedValue, placeholder) {
  const rendered = [];
  if (placeholder) {
    rendered.push(
      `<option value="" ${selectedValue ? "" : "selected"} disabled>${escapeHtml(placeholder)}</option>`
    );
  }

  options.forEach((option) => {
    if (!option) {
      return;
    }

    rendered.push(
      `<option value="${escapeHtml(option)}" ${
        option === selectedValue ? "selected" : ""
      }>${escapeHtml(option)}</option>`
    );
  });

  return rendered.join("");
}

function createDefaultSubgoals() {
  return [createDefaultSubgoal(1), createDefaultSubgoal(2), createDefaultSubgoal(3)];
}

function createDefaultWeeks() {
  return weekDefinitions.reduce((accumulator, week) => {
    accumulator[week.id] = {
      status: "not_started",
      delayedTestCompleted: week.id === "week1",
      subgoalsCompleted: false,
      sessionsCompleted: false,
      delayedTestAnswers: {},
      subgoals: createDefaultWeekSubgoals(),
      currentSessionIndex: 0,
      sessionTimeRemaining: 25 * 60,
      sessions: [null, null, null],
    };
    return accumulator;
  }, {});
}

function createDefaultWeekSubgoals() {
  return [createDefaultWeekSubgoal(1), createDefaultWeekSubgoal(2), createDefaultWeekSubgoal(3)];
}

function createDefaultWeekSubgoal(index) {
  return {
    order: index,
    question: "",
    type: "Concept",
    importance: "4",
    confidence: "4",
    status: "not_started",
  };
}

function createDefaultWeekState(weekId) {
  return {
    ...createDefaultWeeks()[weekId],
  };
}

function resetOnboardingState() {
  onboardingState.step = "welcome";
  onboardingState.completed = false;
  onboardingState.consentAgreed = false;
  onboardingState.demographics = {
    ageRange: "",
    primaryLanguage: "",
    educationLevel: "",
    searchEngineFamiliarity: "4",
    conversationalAiFamiliarity: "4",
    technologyUsageFrequency: "",
  };
  onboardingState.quizAnswers = {};
  onboardingState.subgoals = createDefaultSubgoals();
}

function resetDashboardState() {
  dashboardState.assignedCondition = "Condition not assigned yet";
  dashboardState.currentWeek = "week1";
  dashboardState.weeks = createDefaultWeeks();
}

function resetWeekFlowState() {
  weekFlowState.weekId = "";
  weekFlowState.step = "";
  weekFlowState.delayedTestAnswers = {};
  weekFlowState.subgoals = createDefaultWeekSubgoals();
  weekFlowState.currentSessionIndex = 0;
  weekFlowState.sessionTimeRemaining = 25 * 60;
}

function createDefaultSubgoal(index) {
  return {
    order: index,
    question: "",
    type: "Concept",
    importance: "4",
    confidence: "4",
  };
}

function getWeekAction(weekId, weekState) {
  if (isWeekComplete(weekState)) {
    return {
      statusLabel: "Completed",
      buttonLabel: "Completed",
      description: "This week has already been fully completed.",
      completed: true,
      locked: false,
    };
  }

  if (!isWeekUnlocked(weekId)) {
    const previousWeekIndex = weekDefinitions.findIndex((week) => week.id === weekId) - 1;
    const previousWeekId = weekDefinitions[previousWeekIndex].id;

    return {
      statusLabel: "Locked",
      buttonLabel: "Locked",
      description: `Complete ${formatWeekLabel(previousWeekId)} before this week becomes available.`,
      completed: false,
      locked: true,
    };
  }

  if (weekState.status === "in_progress") {
    if (weekState.subgoalsCompleted) {
      return {
        statusLabel: "In Progress",
        buttonLabel: `Continue ${formatWeekLabel(weekId)}`,
        description: "Weekly setup is finished. Continue into the main research page.",
        completed: false,
        locked: false,
      };
    }

    return {
      statusLabel: "In Progress",
      buttonLabel: `Continue ${formatWeekLabel(weekId)}`,
      description: "This week has started but still needs delayed-test or sub-goal completion.",
      completed: false,
      locked: false,
    };
  }

  return {
    statusLabel: "Not Started",
    buttonLabel: `Start ${formatWeekLabel(weekId)}`,
    description:
      weekId === "week1"
        ? "Week 1 begins directly with sub-goal planning."
        : "This week starts with a short delayed test and then sub-goal planning.",
    completed: false,
    locked: false,
  };
}

function countCompletedWeeks() {
  return weekDefinitions.filter((week) => isWeekComplete(dashboardState.weeks[week.id])).length;
}

function inferCurrentWeek(weekData) {
  const activeWeek = weekDefinitions.find(
    (week) => weekData[week.id] && weekData[week.id].status === "in_progress"
  );
  if (activeWeek) {
    return activeWeek.id;
  }

  const nextWeek = weekDefinitions.find((week) => !isWeekComplete(weekData[week.id] || {}));
  return nextWeek ? nextWeek.id : weekDefinitions[weekDefinitions.length - 1].id;
}

function getDelayedTestQuestions(weekId) {
  return delayedTestQuestionsByWeek[weekId] || delayedTestQuestionsByWeek.week2 || [];
}

function formatWeekLabel(weekId) {
  const found = weekDefinitions.find((week) => week.id === weekId);
  return found ? found.label : weekId;
}

function summarizeWeekProgress() {
  return weekDefinitions.reduce((accumulator, week) => {
    const weekState = dashboardState.weeks[week.id];
    accumulator[week.id] = {
      status: weekState.status,
      delayedTestCompleted: weekState.delayedTestCompleted,
      subgoalsCompleted: weekState.subgoalsCompleted,
    };
    return accumulator;
  }, {});
}

function isWeekComplete(weekState) {
  return weekState.status === "completed" || Boolean(weekState.sessionsCompleted);
}

function isWeekUnlocked(weekId) {
  const currentIndex = weekDefinitions.findIndex((week) => week.id === weekId);
  if (currentIndex <= 0) {
    return true;
  }

  const previousWeekId = weekDefinitions[currentIndex - 1].id;
  return isWeekComplete(dashboardState.weeks[previousWeekId] || {});
}

function getNextAvailableWeekId() {
  const nextWeek = weekDefinitions.find((week) => !isWeekComplete(dashboardState.weeks[week.id]));
  return nextWeek ? nextWeek.id : "";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
