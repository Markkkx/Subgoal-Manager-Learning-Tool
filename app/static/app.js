// ── Imports ───────────────────────────────────────────────────────────────────
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
  saveUserWeek,
  getPostTestQuestions,
  savePostTest,
  saveLearningOutcome,
  saveQuickEvaluation,
} from "./firebase-firestore.js";
import { baselineQuizQuestions } from "./onboarding-quiz.js";
import { delayedTestQuestionsByWeek } from "./delayed-test-questions.js";

// ── DOM References ────────────────────────────────────────────────────────────
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
// Session 2 shell (learning goal statement + goal planning)
const weekShell = document.getElementById("week-shell");
const weekShellEyebrow = document.getElementById("week-shell-eyebrow");
const weekShellTitle = document.getElementById("week-shell-title");
const weekShellSubtitle = document.getElementById("week-shell-subtitle");
const weekShellContent = document.getElementById("week-shell-content");
const weekShellValidation = document.getElementById("week-shell-validation");
const weekShellBack = document.getElementById("week-shell-back");
const weekShellNext = document.getElementById("week-shell-next");
// Session 1 shell (required lecture recording)
const structuredSessionShell = document.getElementById("structured-session-shell");
const structuredSessionEyebrow = document.getElementById("structured-session-eyebrow");
const structuredSessionTitle = document.getElementById("structured-session-title");
const structuredSessionSubtitle = document.getElementById("structured-session-subtitle");
const structuredSessionContent = document.getElementById("structured-session-content");
const structuredSessionValidation = document.getElementById("structured-session-validation");
const structuredSessionBack = document.getElementById("structured-session-back");
const structuredSessionNext = document.getElementById("structured-session-next");
// App shell (main research page)
const appShell = document.getElementById("app-shell");
const postTestShell = document.getElementById("post-test-shell");
const postTestContent = document.getElementById("post-test-content");
const postTestValidation = document.getElementById("post-test-validation");
const postTestButton = document.getElementById("post-test-button");
const postTestBack = document.getElementById("post-test-back");
const postTestSubmit = document.getElementById("post-test-submit");
const learningOutcomeShell = document.getElementById("learning-outcome-shell");
const learningOutcomeEyebrow = document.getElementById("learning-outcome-eyebrow");
const learningOutcomeTitle = document.getElementById("learning-outcome-title");
const learningOutcomeSubtitle = document.getElementById("learning-outcome-subtitle");
const learningOutcomeContent = document.getElementById("learning-outcome-content");
const learningOutcomeValidation = document.getElementById("learning-outcome-validation");
const learningOutcomeBack = document.getElementById("learning-outcome-back");
const learningOutcomeNext = document.getElementById("learning-outcome-next");
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
const browserSearchPanel = document.getElementById("browser-search-panel");
const readingPanel = document.getElementById("reading-panel");
const readingPanelTitle = document.getElementById("reading-panel-title");
const readingPanelUrl = document.getElementById("reading-panel-url");
const readingPanelOpenTab = document.getElementById("reading-panel-open-tab");
const readingPanelClose = document.getElementById("reading-panel-close");
const readingFrame = document.getElementById("reading-frame");
const userIdDisplay = document.getElementById("user-id-display");
const sessionIdDisplay = document.getElementById("session-id-display");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const keywordList = document.getElementById("keyword-list");
const toolToggleButtons = document.querySelectorAll("[data-tool-tab]");
const toolPanels = document.querySelectorAll("[data-tool-panel]");
const quickEvaluationPopup = document.getElementById("quick-evaluation-popup");
const quickEvaluationQuestion = document.getElementById("quick-evaluation-question");
const quickEvaluationOptions = document.getElementById("quick-evaluation-options");
const quickEvaluationDismiss = document.getElementById("quick-evaluation-dismiss");
const completeLearningButton = document.getElementById("complete-learning-button");

// ── Global State ──────────────────────────────────────────────────────────────
let currentUserId = "demo-user";
const sessionId = crypto.randomUUID();
let currentQuery = "";
const chatHistory = [];
let pendingReturnContext = null;
let leftMainPageAt = null;
let returnLogged = false;
let authMode = "login";
let activeTool = "browser";
let activeEvaluation = null;
const evaluationQueue = [];
let researchToolStateVersion = 0;
let activeReadingPanelUrl = "";
let activeReadingPanelRequest = 0;
const SEARCH_PAGE_SIZE = 20;
let searchNextStart = 0;
let searchHasMore = false;
let searchLoadingMore = false;
let activeLearningSession = null;
let learningTimerStartedAt = null;
let learningOutcomeState = {
  weekId: "",
  sessionKey: "",
  step: "summary",
  summary: "",
  wordCount: 0,
  answers: {},
};

const LEARNING_MIN_SECONDS = 25 * 60;
const DEBUG_LEARNING_ELAPSED_PARAM = "debugLearningElapsed";
const PLACEHOLDER_LECTURE_VIDEO_URL = "";
const FREQUENCY_OPTIONS = [
  "More than 3 times a day",
  "At least once a day",
  "More than 3 times a week",
  "Once a week",
  "Less than once a week",
];
const EDUCATION_OPTIONS = [
  "Less than high school",
  "High school degree",
  "Some years in college",
  "College degree or equivalent",
  "Advanced degree from graduate college",
];
const PLACEHOLDER_LEARNING_GOALS = {
  week1: "Placeholder learning goal statement for Week 1. Adrian and Kylie will provide the final goal text.",
  week2: "Placeholder learning goal statement for Week 2. Adrian and Kylie will provide the final goal text.",
  week3: "Placeholder learning goal statement for Week 3. Adrian and Kylie will provide the final goal text.",
  week4: "Placeholder learning goal statement for Week 4. Adrian and Kylie will provide the final goal text.",
};
const PLACEHOLDER_OUTCOME_QUESTIONS = [
  {
    id: "outcome_q1",
    prompt: "[Placeholder] Which idea was most important in today's learning?",
    options: ["Placeholder option A", "Placeholder option B", "Placeholder option C", "Placeholder option D"],
  },
  {
    id: "outcome_q2",
    prompt: "[Placeholder] Which statement best matches what you learned today?",
    options: ["Placeholder option A", "Placeholder option B", "Placeholder option C", "Placeholder option D"],
  },
];

const weekDefinitions = [
  { id: "week1", label: "Week 1" },
  { id: "week2", label: "Week 2" },
  { id: "week3", label: "Week 3" },
  { id: "week4", label: "Week 4" },
];

const onboardingSteps = ["welcome", "consent", "demographics", "quiz"];

const onboardingState = {
  step: "welcome",
  completed: false,
  consentAgreed: false,
  demographics: {
    gender: "",
    age: "",
    educationLevel: "",
    nativeLanguageEnglish: "",
    englishLearningStartAge: "",
    searchEngineUseFrequency: "",
    conversationalAiUseFrequency: "",
  },
  quizAnswers: {},
  subgoals: createDefaultSubgoals(),
};

const dashboardState = {
  assignedCondition: "Condition not assigned yet",
  currentWeek: "week1",
  currentSession: "structured", // "structured" | "exploratory"
  weeks: createDefaultWeeks(),
};

// State for the Session 2 pre-flow (learning goal planning)
const weekFlowState = {
  weekId: "",
  step: "",           // "goalPlanning"
  delayedTestAnswers: {},
  subgoals: createDefaultWeekSubgoals(),
  currentSessionIndex: 0,
  sessionTimeRemaining: 25 * 60,
};

// State for the Session 1 video gate
const structuredSessionState = {
  weekId: "",
  step: "video", // "video"
  videoCompleted: false,
};

if (sessionIdDisplay) {
  sessionIdDisplay.textContent = sessionId;
}
initializeInterface();

// ── Search ────────────────────────────────────────────────────────────────────
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const queryText = queryInput.value.trim();
  if (!queryText) {
    statusMessage.textContent = "Enter a search query first.";
    return;
  }

  const requestVersion = researchToolStateVersion;
  const requestUserId = currentUserId;
  currentQuery = queryText;
  searchNextStart = 0;
  searchHasMore = false;
  statusMessage.textContent = "Searching...";
  resultsContainer.innerHTML = "";
  hideReadingPanel();

  try {
    const data = await fetchSearchResults(queryText, 0);
    if (requestVersion !== researchToolStateVersion || requestUserId !== currentUserId) return;

    renderResults(data.results);
    renderKeywords(data.keywords || []);
    searchNextStart = data.next_start ?? data.results.length;
    searchHasMore = Boolean(data.has_more);
    renderLoadMoreButton();
    statusMessage.textContent = `Showing ${searchNextStart} result(s) for "${queryText}".`;
  } catch (error) {
    if (requestVersion !== researchToolStateVersion || requestUserId !== currentUserId) return;
    renderEmptyState("The search could not be completed.");
    renderKeywords([]);
    statusMessage.textContent = error.message;
  }
});

async function fetchSearchResults(queryText, start) {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: currentUserId,
      session_id: sessionId,
      query_text: queryText,
      start,
      num: SEARCH_PAGE_SIZE,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Search request failed.");
  return data;
}

toolToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTool(button.dataset.toolTab);
  });
});

// ── Chat ──────────────────────────────────────────────────────────────────────
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();
  if (!message) return;

  const requestVersion = researchToolStateVersion;
  const requestUserId = currentUserId;
  appendChatMessage("user", message);
  chatHistory.push({ role: "user", content: message });
  chatInput.value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: chatHistory,
        current_query: currentQuery,
        user_id: currentUserId,
        session_id: sessionId,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Chat request failed.");
    if (requestVersion !== researchToolStateVersion || requestUserId !== currentUserId) return;

    appendChatMessage("assistant", data.reply);
    chatHistory.push({ role: "assistant", content: data.reply });
    enqueueQuickEvaluation({
      eventType: "chatbot_answer_shown",
      tool: "ai_chat",
      sourceType: "chatbot_response",
      questions: [
        { id: "newInformation", text: "How much new information did you find in this response?" },
        { id: "readability", text: "How easy was it to read?" },
        { id: "learning", text: "How much did you learn from this response?" },
      ],
      metadata: {
        queryText: currentQuery,
        chatQuestion: message,
        chatAnswer: data.reply,
        responseId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    if (requestVersion !== researchToolStateVersion || requestUserId !== currentUserId) return;
    appendChatMessage("assistant", `Chat error: ${error.message}`);
  }
});

// ── Click / Return Tracking ───────────────────────────────────────────────────
document.addEventListener("visibilitychange", async () => {
  if (!pendingReturnContext) return;
  if (document.hidden) {
    leftMainPageAt = new Date();
    returnLogged = false;
    return;
  }
  if (!document.hidden) await tryLogReturnEvent();
});

window.addEventListener("focus", async () => {
  await tryLogReturnEvent();
});

if (quickEvaluationDismiss) {
  quickEvaluationDismiss.addEventListener("click", dismissQuickEvaluation);
}

if (readingPanelClose) {
  readingPanelClose.addEventListener("click", closeReadingPanel);
}

if (readingPanelOpenTab) {
  readingPanelOpenTab.addEventListener("click", () => {
    if (activeReadingPanelUrl) {
      window.open(activeReadingPanelUrl, "_blank", "noopener,noreferrer");
    }
  });
}

// ── Auth UI ───────────────────────────────────────────────────────────────────
loginTab.addEventListener("click", () => setAuthMode("login"));
signupTab.addEventListener("click", () => setAuthMode("signup"));

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
    if (credential && credential.user) handleAuthenticatedUser(credential.user);
  } catch (error) {
    console.error("Auth error:", error);
    authError.textContent = mapAuthError(error);
  }
});

logoutButton.addEventListener("click", async () => { await logoutUser(); });
dashboardLogoutButton.addEventListener("click", async () => { await logoutUser(); });

if (completeLearningButton) {
  completeLearningButton.addEventListener("click", async () => {
    if (!activeLearningSession || completeLearningButton.disabled) return;
    await completeLearningSession();
  });
}

if (learningOutcomeBack) {
  learningOutcomeBack.addEventListener("click", async () => {
    await loadDashboardState();
    showDashboardView();
  });
}

if (learningOutcomeNext) {
  learningOutcomeNext.addEventListener("click", async () => {
    learningOutcomeValidation.textContent = "";
    const error = await readAndPersistLearningOutcomeStep();
    if (error) {
      learningOutcomeValidation.textContent = error;
      return;
    }
    if (learningOutcomeState.step === "summary") {
      learningOutcomeState.step = "questions";
      renderLearningOutcomeStep();
      return;
    }
    await finalizeLearningOutcome();
  });
}

// ── Onboarding Navigation ─────────────────────────────────────────────────────
onboardingBack.addEventListener("click", async () => {
  const currentIndex = onboardingSteps.indexOf(onboardingState.step);
  if (currentIndex <= 0) return;
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
  if (onboardingState.step === "quiz") {
    onboardingState.completed = true;
    await persistOnboardingProgress();
    await loadDashboardState();
    showDashboardView();
    return;
  }

  const isLastStep = currentIndex === onboardingSteps.length - 1;
  if (isLastStep) {
    await loadDashboardState();
    showDashboardView();
    return;
  }

  setOnboardingStep(onboardingSteps[currentIndex + 1]);
  await persistOnboardingProgress();
});

// ── Session 2 Shell Navigation ────────────────────────────────────────────────
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
  await beginLearningSession(weekFlowState.weekId, "session2");
});

// ── Session 1 Shell Navigation ────────────────────────────────────────────────
structuredSessionBack.addEventListener("click", async () => {
  // Save the current step so the user can resume if they come back
  if (structuredSessionState.weekId) {
    await saveUserWeek(currentUserId, structuredSessionState.weekId, {
      ...dashboardState.weeks[structuredSessionState.weekId],
      structuredStep: structuredSessionState.step,
    });
  }
  await loadDashboardState();
  showDashboardView();
});

structuredSessionNext.addEventListener("click", async () => {
  structuredSessionValidation.textContent = "";
  const error = readAndValidateStructuredStep();
  if (error) {
    structuredSessionValidation.textContent = error;
    return;
  }

  await beginLearningSession(structuredSessionState.weekId, "session1");
});

// ── Auth State Listener ───────────────────────────────────────────────────────
onAuthReady((user) => {
  if (!user) {
    resetResearchToolState();
    currentUserId = "demo-user";
    showAuthView();
    return;
  }
  void handleAuthenticatedUser(user);
});

// ── Initialization ────────────────────────────────────────────────────────────
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

// ── View Switching ────────────────────────────────────────────────────────────
function hideAllShells() {
  authShell.classList.add("hidden");
  onboardingShell.classList.add("hidden");
  dashboardShell.classList.add("hidden");
  weekShell.classList.add("hidden");
  structuredSessionShell.classList.add("hidden");
  appShell.classList.add("hidden");
  postTestShell.classList.add("hidden");
  learningOutcomeShell.classList.add("hidden");
}

function showAuthView() {
  resetOnboardingState();
  resetDashboardState();
  resetWeekFlowState();
  hideAllShells();
  authShell.classList.remove("hidden");
  authPassword.value = "";
  authEmail.value = "";
}

function showOnboardingView() {
  hideAllShells();
  onboardingShell.classList.remove("hidden");
}

function showDashboardView() {
  hideAllShells();
  dashboardShell.classList.remove("hidden");
  renderDashboard();
}

function showWeekShellView() {
  hideAllShells();
  weekShell.classList.remove("hidden");
}

function showStructuredSessionView() {
  hideAllShells();
  structuredSessionShell.classList.remove("hidden");
}

function showAppView() {
  hideAllShells();
  resetResearchToolState();
  appShell.classList.remove("hidden");
  const layoutGrid = document.getElementById("layout-grid");
  const sidebar = document.getElementById("subgoal-sidebar");
  const hideSidebar = activeLearningSession?.sessionType === "session1";
  if (layoutGrid) layoutGrid.classList.toggle("no-sidebar", hideSidebar);
  if (sidebar) sidebar.classList.toggle("hidden", hideSidebar);
  startCountdown();
  renderSubgoalSidebar();
}

function showPostTestView() {
  hideAllShells();
  postTestShell.classList.remove("hidden");
}

function showLearningOutcomeView() {
  hideAllShells();
  learningOutcomeShell.classList.remove("hidden");
  renderLearningOutcomeStep();
}

// ── Auth Handler ──────────────────────────────────────────────────────────────
async function handleAuthenticatedUser(user) {
  resetOnboardingState();
  resetDashboardState();
  resetWeekFlowState();
  resetResearchToolState();
  currentUserId = user.uid;
  if (userIdDisplay) userIdDisplay.textContent = currentUserId;
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

// ── Dashboard Data ────────────────────────────────────────────────────────────
async function loadDashboardState() {
  try {
    const [onboardingData, weekData] = await Promise.all([
      getUserOnboarding(currentUserId),
      getUserWeekProgress(currentUserId),
    ]);

    dashboardState.assignedCondition =
      onboardingData.profile.assignedCondition || "Condition not assigned yet";
    dashboardState.currentWeek = onboardingData.profile.currentWeek || inferCurrentWeek(weekData);
    dashboardState.currentSession = onboardingData.profile.currentSession || "structured";
    dashboardState.weeks = createDefaultWeeks();

    weekDefinitions.forEach((week) => {
      const mergedWeek = {
        ...dashboardState.weeks[week.id],
        ...(weekData[week.id] || {}),
      };
      dashboardState.weeks[week.id] = {
        ...mergedWeek,
        legacySessions: Array.isArray(mergedWeek.sessions)
          ? mergedWeek.sessions
          : mergedWeek.legacySessions || null,
        sessions: normalizeWeekSessions(mergedWeek, week.id),
      };
    });
  } catch (error) {
    console.error("Dashboard load error:", error);
    dashboardState.assignedCondition = "Condition not assigned yet";
    dashboardState.currentWeek = "week1";
    dashboardState.weeks = createDefaultWeeks();
  }
}

// ── Dashboard Rendering ───────────────────────────────────────────────────────
function renderDashboard() {
  const completedWeeks = countCompletedWeeks();
  const allDone = completedWeeks === weekDefinitions.length;

  dashboardUserName.textContent = authUserDisplay.textContent || currentUserId;
  dashboardProgressLabel.textContent = `${completedWeeks} of ${weekDefinitions.length} weeks completed`;
  dashboardProgressCaption.textContent = allDone
    ? "All study weeks are completed"
    : `Next: ${getNextSessionDescription()}`;
  dashboardProgressFill.style.width = `${(completedWeeks / weekDefinitions.length) * 100}%`;

  // Each week renders as a labeled group containing two session cards
  weekCardList.innerHTML = weekDefinitions
    .map((week) => {
      const weekState = dashboardState.weeks[week.id];
      const sAction = getStructuredSessionAction(week.id, weekState);
      const eAction = getExploratorySessionAction(week.id, weekState);

      return `
        <div class="week-group">
          <p class="week-group-label">${escapeHtml(week.label)}</p>
          <div class="session-card-row">
            <article class="session-entry-card">
              <span class="session-status-badge ${sAction.statusClass}">${escapeHtml(sAction.statusLabel)}</span>
              <h4>${escapeHtml(formatSessionLabel(week.id, "session1"))}</h4>
              <p class="session-entry-meta">${escapeHtml(sAction.description)}</p>
              <button
                class="session-entry-action ${sAction.completed ? "completed" : ""} ${sAction.locked ? "locked" : ""}"
                type="button"
                data-structured-action="${escapeHtml(week.id)}"
                ${sAction.completed || sAction.locked ? "disabled" : ""}
              >${escapeHtml(sAction.buttonLabel)}</button>
            </article>

            <article class="session-entry-card">
              <span class="session-status-badge ${eAction.statusClass}">${escapeHtml(eAction.statusLabel)}</span>
              <h4>${escapeHtml(formatSessionLabel(week.id, "session2"))}</h4>
              <p class="session-entry-meta">${escapeHtml(eAction.description)}</p>
              <button
                class="session-entry-action ${eAction.completed ? "completed" : ""} ${eAction.locked ? "locked" : ""}"
                type="button"
                data-exploratory-action="${escapeHtml(week.id)}"
                ${eAction.completed || eAction.locked ? "disabled" : ""}
              >${escapeHtml(eAction.buttonLabel)}</button>
            </article>
          </div>
        </div>
      `;
    })
    .join("");

  // Attach click handlers after innerHTML is set
  document.querySelectorAll("[data-structured-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const weekId = button.getAttribute("data-structured-action");
      await openStructuredSession(weekId);
    });
  });

  document.querySelectorAll("[data-exploratory-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const weekId = button.getAttribute("data-exploratory-action");
      await openExploratorySession(weekId);
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

// ── Session Action Descriptors ────────────────────────────────────────────────

function getStructuredSessionAction(weekId, weekState) {
  const weekUnlocked = isWeekUnlocked(weekId);
  const sessionState = getWeekSessionState(weekState, weekId, "session1");
  const structuredStatus =
    isSessionComplete(weekId, weekState, "session1")
      ? "completed"
      : sessionState.status !== "not_started"
        ? sessionState.status
        : weekState.structuredStatus || "not_started";

  if (!weekUnlocked) {
    const prevIdx = weekDefinitions.findIndex((w) => w.id === weekId) - 1;
    const prevLabel = formatWeekLabel(weekDefinitions[prevIdx].id);
    return {
      statusLabel: "Locked",
      statusClass: "status-locked",
      buttonLabel: "Locked",
      description: `Complete ${prevLabel} before this becomes available.`,
      completed: false,
      locked: true,
    };
  }

  if (structuredStatus === "completed") {
    return {
      statusLabel: "Completed",
      statusClass: "status-completed",
      buttonLabel: "Completed",
      description: "You have completed this session.",
      completed: true,
      locked: false,
    };
  }

  if (structuredStatus === "in_progress") {
    return {
      statusLabel: "In Progress",
      statusClass: "status-in-progress",
      buttonLabel: "Resume Session 1",
      description: "Continue where you left off in Session 1.",
      completed: false,
      locked: false,
    };
  }

  return {
    statusLabel: "Not Started",
    statusClass: "status-not-started",
    buttonLabel: "Start Session 1",
    description: "Watch the lecture recording, then complete at least 25 minutes of learning.",
    completed: false,
    locked: false,
  };
}

function getExploratorySessionAction(weekId, weekState) {
  const weekUnlocked = isWeekUnlocked(weekId);
  const structuredDone = isSessionComplete(weekId, weekState, "session1");
  const sessionState = getWeekSessionState(weekState, weekId, "session2");
  const exploratoryStatus =
    isSessionComplete(weekId, weekState, "session2")
      ? "completed"
      : sessionState.status !== "not_started"
        ? sessionState.status
        : weekState.exploratoryStatus || "not_started";

  // Locked if the week itself is locked or structured session not yet done
  if (!weekUnlocked || !structuredDone) {
    return {
      statusLabel: "Locked",
      statusClass: "status-locked",
      buttonLabel: "Locked",
      description: structuredDone
        ? `Complete ${formatWeekLabel(weekDefinitions[weekDefinitions.findIndex((w) => w.id === weekId) - 1]?.id)} first.`
        : "Complete Session 1 for this week first.",
      completed: false,
      locked: true,
    };
  }

  if (exploratoryStatus === "completed") {
    return {
      statusLabel: "Completed",
      statusClass: "status-completed",
      buttonLabel: "Completed",
      description: "You have completed this session.",
      completed: true,
      locked: false,
    };
  }

  if (exploratoryStatus === "in_progress") {
    return {
      statusLabel: "In Progress",
      statusClass: "status-in-progress",
      buttonLabel: "Resume Session 2",
      description: "Continue where you left off in Session 2.",
      completed: false,
      locked: false,
    };
  }

  return {
    statusLabel: "Not Started",
    statusClass: "status-not-started",
    buttonLabel: "Start Session 2",
    description: "Review the learning goal statement, plan your goals, then learn for at least 25 minutes.",
    completed: false,
    locked: false,
  };
}

// ── Post-Test ─────────────────────────────────────────────────────────────────
postTestButton.addEventListener("click", async () => {
  showPostTestView();
  postTestValidation.textContent = "";
  postTestContent.innerHTML = '<p style="color:var(--muted)">Loading questions…</p>';
  try {
    const questions = await getPostTestQuestions();
    renderPostTestForm(questions);
  } catch {
    postTestContent.innerHTML =
      '<p style="color:#e53e3e">Failed to load questions. Please try again.</p>';
  }
});

postTestBack.addEventListener("click", () => { showDashboardView(); });

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

  const radioNames = [
    ...new Set([...postTestContent.querySelectorAll("input[type=radio]")].map((r) => r.name)),
  ];
  radioNames.forEach((name) => { if (!answers[name]) allAnswered = false; });

  if (!allAnswered) {
    postTestValidation.textContent = "Please answer all questions before submitting.";
    return;
  }

  postTestSubmit.disabled = true;
  postTestSubmit.textContent = "Submitting…";
  try {
    await savePostTest(currentUserId, answers);
    postTestContent.innerHTML =
      '<p style="font-weight:700;color:var(--accent-dark)">Post-test submitted. Thank you!</p>';
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
              ${q.options
                .map(
                  (opt) => `
                <label class="quiz-option-label">
                  <input type="radio" name="q_${q.id}" value="${escapeHtml(opt)}" required />
                  ${escapeHtml(opt)}
                </label>`
                )
                .join("")}
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

// ── Session 1 ─────────────────────────────────────────────────────────────────

// Entry point: open or resume Session 1 for a given week.
async function openStructuredSession(weekId) {
  const weekState = dashboardState.weeks[weekId];
  const sessionState = getWeekSessionState(weekState, weekId, "session1");

  if (!isWeekUnlocked(weekId)) return;
  if (sessionState.learningOutcomeCompleted) return;
  if (sessionState.learningCompletedAt && !sessionState.learningOutcomeCompleted) {
    learningOutcomeState = {
      weekId,
      sessionKey: getSessionKey(weekId, "session1"),
      step: "summary",
      summary: "",
      wordCount: 0,
      answers: {},
    };
    showLearningOutcomeView();
    return;
  }
  if (sessionState.videoCompleted && sessionState.learningStartedAt && !sessionState.learningCompletedAt) {
    activeLearningSession = { weekId, sessionType: "session1", sessionKey: getSessionKey(weekId, "session1") };
    dashboardState.currentWeek = weekId;
    dashboardState.currentSession = "session1";
    showAppView();
    return;
  }
  if (sessionState.status === "completed" || weekState.structuredStatus === "completed") return;

  structuredSessionState.weekId = weekId;
  structuredSessionState.step = "video";
  structuredSessionState.videoCompleted = Boolean(sessionState.videoCompleted);

  // New Session 1 starts with a required lecture recording. Keep legacy fields for older dashboards.
  dashboardState.weeks[weekId] = {
    ...weekState,
    structuredStatus: "in_progress",
    structuredStep: "video",
    sessions: upsertWeekSession(weekState, weekId, "session1", {
      status: "in_progress",
      videoCompleted: structuredSessionState.videoCompleted,
    }),
  };
  await saveUserWeek(currentUserId, weekId, dashboardState.weeks[weekId]);

  showStructuredSessionView();
  renderStructuredSessionStep();
}

// Render the current step of the structured session.
function renderStructuredSessionStep() {
  const weekLabel = formatWeekLabel(structuredSessionState.weekId);
  structuredSessionEyebrow.textContent = `${weekLabel} · Session 1`;
  structuredSessionValidation.textContent = "";

  if (structuredSessionState.step === "video") {
    structuredSessionTitle.textContent = "Watch the Lecture Recording";
    structuredSessionSubtitle.textContent =
      "The learning activity unlocks after the video reaches the end.";
    structuredSessionNext.textContent = "Start Learning";
    structuredSessionNext.disabled = !structuredSessionState.videoCompleted;

    structuredSessionContent.innerHTML = `
      <section class="onboarding-section">
        <div class="onboarding-panel">
          <p class="onboarding-copy">
            Please watch the lecture recording before starting learning.
          </p>
          <p class="onboarding-copy">
            [Placeholder] Add the real video URL to <code>PLACEHOLDER_LECTURE_VIDEO_URL</code>
            in <code>app/static/app.js</code> when it is ready.
          </p>
        </div>
        ${renderLectureVideoPlaceholder()}
      </section>
    `;
    attachLectureVideoTracking();
    return;
  }
}

function renderLectureVideoPlaceholder() {
  if (PLACEHOLDER_LECTURE_VIDEO_URL) {
    return `
      <video id="lecture-video" class="lecture-video" controls controlsList="nodownload noplaybackrate" disablepictureinpicture>
        <source src="${escapeHtml(PLACEHOLDER_LECTURE_VIDEO_URL)}" />
      </video>
    `;
  }
  return `
    <div class="lecture-video placeholder" id="lecture-video-placeholder" role="group" aria-label="Placeholder lecture video">
      <div>
        <p class="lecture-video-title">Lecture video placeholder</p>
        <p class="lecture-video-copy">Use this placeholder until the real video file is connected.</p>
      </div>
      <button id="placeholder-video-complete" class="primary-action" type="button">Mark Placeholder Video Complete</button>
    </div>
  `;
}

function attachLectureVideoTracking() {
  const video = document.getElementById("lecture-video");
  const placeholderButton = document.getElementById("placeholder-video-complete");
  const markComplete = async () => {
    structuredSessionState.videoCompleted = true;
    structuredSessionNext.disabled = false;
    const weekId = structuredSessionState.weekId;
    const weekState = dashboardState.weeks[weekId] || {};
    dashboardState.weeks[weekId] = {
      ...weekState,
      sessions: upsertWeekSession(weekState, weekId, "session1", {
        status: "in_progress",
        videoCompleted: true,
      }),
    };
    await saveUserWeek(currentUserId, weekId, dashboardState.weeks[weekId]);
  };

  if (placeholderButton) {
    placeholderButton.addEventListener("click", markComplete);
  }

  if (video) {
    let furthestTime = 0;
    video.addEventListener("timeupdate", () => {
      if (video.currentTime > furthestTime + 0.75) {
        video.currentTime = furthestTime;
        return;
      }
      furthestTime = Math.max(furthestTime, video.currentTime);
    });
    video.addEventListener("seeking", () => {
      if (video.currentTime > furthestTime + 1) video.currentTime = furthestTime;
    });
    video.addEventListener("ended", markComplete);
  }
}

function readAndValidateStructuredStep() {
  if (!structuredSessionState.videoCompleted) {
    return "Please watch the lecture recording to the end before starting learning.";
  }
  return "";
}

// ── Session 2 ─────────────────────────────────────────────────────────────────

// Entry point: open or resume Session 2 for a given week.
async function openExploratorySession(weekId) {
  const weekState = dashboardState.weeks[weekId];
  const sessionState = getWeekSessionState(weekState, weekId, "session2");

  if (!isWeekUnlocked(weekId)) return;
  if (!isSessionComplete(weekId, weekState, "session1")) return;
  if (sessionState.learningOutcomeCompleted) return;
  if (sessionState.learningCompletedAt && !sessionState.learningOutcomeCompleted) {
    learningOutcomeState = {
      weekId,
      sessionKey: getSessionKey(weekId, "session2"),
      step: "summary",
      summary: "",
      wordCount: 0,
      answers: {},
    };
    showLearningOutcomeView();
    return;
  }
  if (sessionState.status === "completed" || weekState.exploratoryStatus === "completed") return;

  if (sessionState.goalPlanningCompleted && sessionState.learningStartedAt && !sessionState.learningCompletedAt) {
    weekFlowState.weekId = weekId;
    weekFlowState.subgoals =
      weekState.subgoals && weekState.subgoals.length === 3
        ? weekState.subgoals
        : createDefaultWeekSubgoals();
    weekFlowState.currentSessionIndex = weekState.currentSessionIndex ?? 0;
    weekFlowState.sessionTimeRemaining = weekState.sessionTimeRemaining ?? 25 * 60;
    dashboardState.currentWeek = weekId;
    dashboardState.currentSession = "session2";
    activeLearningSession = { weekId, sessionType: "session2", sessionKey: getSessionKey(weekId, "session2") };

    await saveUserStudyProfile(currentUserId, {
      currentWeek: dashboardState.currentWeek,
      currentSession: dashboardState.currentSession,
      assignedCondition: dashboardState.assignedCondition,
      weekProgress: summarizeWeekProgress(),
    });
    showAppView();
    return;
  }

  weekFlowState.weekId = weekId;
  weekFlowState.step = "goalPlanning";
  weekFlowState.subgoals =
    weekState.subgoals && weekState.subgoals.length === 3
      ? weekState.subgoals
      : createDefaultWeekSubgoals();

  dashboardState.weeks[weekId] = {
    ...weekState,
    exploratoryStatus: "in_progress",
    exploratoryStartedAt: weekState.exploratoryStartedAt || new Date().toISOString(),
    sessions: upsertWeekSession(weekState, weekId, "session2", {
      status: "in_progress",
      goalPlanningCompleted: Boolean(sessionState.goalPlanningCompleted),
    }),
  };
  dashboardState.currentWeek = weekId;
  dashboardState.currentSession = "session2";

  await saveUserWeek(currentUserId, weekId, dashboardState.weeks[weekId]);
  await saveUserStudyProfile(currentUserId, {
    currentWeek: dashboardState.currentWeek,
    currentSession: dashboardState.currentSession,
    assignedCondition: dashboardState.assignedCondition,
    weekProgress: summarizeWeekProgress(),
  });

  showWeekShellView();
  renderWeekFlowStep();
}

// Render the delayed test or subgoal planning step.
function renderWeekFlowStep() {
  const weekLabel = formatWeekLabel(weekFlowState.weekId);
  weekShellEyebrow.textContent = `${weekLabel} · Session 2`;
  weekShellValidation.textContent = "";
  weekShellTitle.textContent = "Learning Goal Planning";
  weekShellSubtitle.textContent = "Review the learning goal statement and write your goals for this session.";
  weekShellNext.textContent = "Start Learning";
  weekShellContent.innerHTML = `
    <section class="onboarding-section">
      <div class="onboarding-panel">
        <p class="onboarding-copy">${escapeHtml(getLearningGoalStatement(weekFlowState.weekId))}</p>
      </div>
      <div class="subgoal-list">
        ${weekFlowState.subgoals
          .map(
            (goal, index) => `
              <article class="subgoal-card">
                <div class="form-grid">
                  <div class="field-group full-width">
                    <label for="weekly-goal-question-${index}">Goal ${index + 1}${index === 0 ? " (required)" : " (optional)"}</label>
                    <input
                      id="weekly-goal-question-${index}"
                      type="text"
                      value="${escapeHtml(goal.question)}"
                      placeholder="Write a learning goal for this session"
                    />
                  </div>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
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
                  ${weekFlowState.delayedTestAnswers[question.id] === option ? "checked" : ""}
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

// ── Subgoal Sidebar ───────────────────────────────────────────────────────────
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

// ── Session Indicator ─────────────────────────────────────────────────────────
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
      sessions: normalizeWeekSessions(weekState, weekFlowState.weekId),
    });
  }
  await loadDashboardState();
  showDashboardView();
});

// ── Micro-Check Overlay ───────────────────────────────────────────────────────
function showMicroCheck(sessionIndex) {
  // TODO: Session check-in questions need to be redesigned based on professor feedback.
  return;
  const overlay = document.getElementById("micro-check-overlay");
  const submit = document.getElementById("mc-submit");
  const error = document.getElementById("mc-error");
  if (!overlay) return;

  const isLast = sessionIndex >= 2;
  if (submit) submit.textContent = isLast ? "Finish Week" : "Continue to Next Session";
  if (error) error.textContent = "";

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
    // All 3 exploratory sub-sessions done — mark exploratory session as completed
    dashboardState.weeks[weekFlowState.weekId] = {
      ...dashboardState.weeks[weekFlowState.weekId],
      status: "completed",
      sessionsCompleted: true,
      exploratoryStatus: "completed",
      exploratoryCompletedAt: new Date().toISOString(),
    };
    await saveUserWeek(currentUserId, weekFlowState.weekId, dashboardState.weeks[weekFlowState.weekId]);
    await loadDashboardState();
    showDashboardView();
  } else {
    // Advance to next sub-session
    startCountdown(25 * 60);
    renderSessionIndicator();
    renderSubgoalSidebar();
  }
});

// ── Session Timer (elapsed, not countdown) ────────────────────────────────────
// Counts up from 00:00. Label turns red after 25 minutes to remind the user,
// but there is no hard time limit — the session continues indefinitely.
let countdownInterval = null;
const TIMER_WARN_SECONDS = LEARNING_MIN_SECONDS;

function getDebugLearningElapsedSeconds() {
  const params = new URLSearchParams(window.location.search);
  const rawValue = params.get(DEBUG_LEARNING_ELAPSED_PARAM);
  if (!rawValue) return 0;
  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  const bar = document.getElementById("countdown-bar");
  const label = document.getElementById("countdown-label");
  // Local testing helper: append ?debugLearningElapsed=1501 to the URL to
  // simulate passing the 25-minute learning requirement without altering data.
  const debugElapsedOffset = getDebugLearningElapsedSeconds();
  const activeWeek = activeLearningSession ? dashboardState.weeks[activeLearningSession.weekId] : null;
  const savedSession = activeLearningSession
    ? getWeekSessionState(activeWeek || {}, activeLearningSession.weekId, activeLearningSession.sessionType)
    : null;
  learningTimerStartedAt = savedSession?.learningStartedAt
    ? new Date(savedSession.learningStartedAt)
    : new Date();

  function tick() {
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - learningTimerStartedAt.getTime()) / 1000) + debugElapsedOffset
    );
    const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    if (label) {
      label.textContent = `${m}:${s}`;
      // Turn red once the suggested 25-minute mark is passed
      label.style.color = elapsed >= TIMER_WARN_SECONDS ? "#e53e3e" : "";
    }
    // Progress bar fills to 100% at 25 min then stays full (and bar turns red via CSS class)
    const progress = Math.min(elapsed / TIMER_WARN_SECONDS, 1);
    if (bar) {
      bar.style.setProperty("--progress", progress);
      bar.classList.toggle("timer-over", elapsed >= TIMER_WARN_SECONDS);
    }
    weekFlowState.sessionTimeRemaining = elapsed;
    if (completeLearningButton) {
      completeLearningButton.disabled = elapsed < LEARNING_MIN_SECONDS;
      completeLearningButton.textContent =
        elapsed < LEARNING_MIN_SECONDS ? "Complete Learning" : "Complete Learning";
    }
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

// ── Search Results / Summary / Keywords ──────────────────────────────────────
function renderResults(results, options = {}) {
  if (!results.length) {
    if (!options.append) renderEmptyState("No results were returned for this query.");
    return;
  }

  if (!options.append) resultsContainer.innerHTML = "";

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
        openResultInReadingPanel(result);
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

function renderLoadMoreButton() {
  const existingButton = document.getElementById("load-more-results");
  if (existingButton) existingButton.remove();
  if (!searchHasMore || !currentQuery) return;

  const button = document.createElement("button");
  button.id = "load-more-results";
  button.className = "load-more-results";
  button.type = "button";
  button.textContent = searchLoadingMore ? "Loading..." : "Load more results";
  button.disabled = searchLoadingMore;
  button.addEventListener("click", loadMoreSearchResults);
  resultsContainer.appendChild(button);
}

async function loadMoreSearchResults() {
  if (searchLoadingMore || !searchHasMore || !currentQuery) return;

  const requestVersion = researchToolStateVersion;
  const requestUserId = currentUserId;
  searchLoadingMore = true;
  renderLoadMoreButton();
  statusMessage.textContent = "Loading more results...";

  try {
    const data = await fetchSearchResults(currentQuery, searchNextStart);
    if (requestVersion !== researchToolStateVersion || requestUserId !== currentUserId) return;

    searchNextStart = data.next_start ?? searchNextStart + data.results.length;
    searchHasMore = Boolean(data.has_more) && data.results.length > 0;
    renderResults(data.results, { append: true });
    statusMessage.textContent = `Showing ${searchNextStart} result(s) for "${currentQuery}".`;
  } catch (error) {
    if (requestVersion !== researchToolStateVersion || requestUserId !== currentUserId) return;
    statusMessage.textContent = error.message;
  } finally {
    if (requestVersion === researchToolStateVersion && requestUserId === currentUserId) {
      searchLoadingMore = false;
      renderLoadMoreButton();
    }
  }
}

async function openResultInReadingPanel(result) {
  if (!readingPanel || !readingFrame) {
    window.open(result.url, "_blank", "noopener,noreferrer");
    return;
  }

  const requestId = activeReadingPanelRequest + 1;
  activeReadingPanelRequest = requestId;
  activeReadingPanelUrl = result.url;

  if (readingPanelTitle) readingPanelTitle.textContent = result.title || "Reading Panel";
  if (readingPanelUrl) readingPanelUrl.textContent = result.url;
  readingPanel.classList.remove("hidden");
  if (browserSearchPanel) browserSearchPanel.classList.add("reading-panel-active");
  if (pendingReturnContext && !leftMainPageAt) {
    leftMainPageAt = new Date();
    returnLogged = false;
  }
  statusMessage.textContent = "Opening result in the reading panel...";

  let loaded = false;
  const timeoutId = window.setTimeout(() => {
    if (requestId === activeReadingPanelRequest && !loaded) {
      openReadingPanelFallback(result.url, "The page did not load in the reading panel.");
    }
  }, 6000);

  readingFrame.onload = () => {
    if (requestId !== activeReadingPanelRequest) return;
    loaded = true;
    window.clearTimeout(timeoutId);
    statusMessage.textContent = "Result opened in the reading panel.";
  };
  readingFrame.src = result.url;

  try {
    const response = await fetch("/api/embed-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: result.url }),
    });
    const data = await response.json();
    if (requestId !== activeReadingPanelRequest) return;
    if (response.ok && !data.can_embed) {
      window.clearTimeout(timeoutId);
      openReadingPanelFallback(result.url, "The page refused to load in the reading panel.");
    } else if (!response.ok) {
      console.warn("Embed check returned an error:", data.error || data.reason || response.status);
    }
  } catch (error) {
    console.error("Embed check failed:", error);
  }
}

function openReadingPanelFallback(url, message) {
  activeReadingPanelRequest += 1;
  leftMainPageAt = null;
  returnLogged = false;
  if (readingFrame) {
    readingFrame.onload = null;
    readingFrame.removeAttribute("src");
  }
  if (readingPanel) readingPanel.classList.add("hidden");
  if (browserSearchPanel) browserSearchPanel.classList.remove("reading-panel-active");
  statusMessage.textContent = `${message} Opening it in a new tab.`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function hideReadingPanel() {
  activeReadingPanelRequest += 1;
  activeReadingPanelUrl = "";
  if (readingFrame) {
    readingFrame.onload = null;
    readingFrame.removeAttribute("src");
  }
  if (readingPanel) readingPanel.classList.add("hidden");
  if (browserSearchPanel) browserSearchPanel.classList.remove("reading-panel-active");
}

async function closeReadingPanel() {
  hideReadingPanel();
  if (pendingReturnContext && leftMainPageAt) {
    await tryLogReturnEvent();
  }
}

function renderKeywords(keywords) {
  if (!keywords.length) {
    keywordList.innerHTML = '<span class="keyword-empty">No keywords available yet.</span>';
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

// ── Click / Return Logging ────────────────────────────────────────────────────
async function logClickEvent(payload) {
  const response = await fetch("/api/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Click log request failed.");
  }
}

function setActiveTool(nextTool, options = {}) {
  if (!nextTool || nextTool === activeTool) return;

  const { logSwitch = true } = options;
  const previousTool = activeTool;
  activeTool = nextTool;

  toolToggleButtons.forEach((button) => {
    const isActive = button.dataset.toolTab === nextTool;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  toolPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.toolPanel !== nextTool);
  });

  if (logSwitch) {
    logToolSwitch(previousTool, nextTool).catch((error) => {
      console.error("Tool switch log failed:", error);
    });
  }

}

async function logToolSwitch(previousTool, nextTool) {
  const response = await fetch("/api/tool-switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: currentUserId,
      session_id: sessionId,
      previous_tool: previousTool,
      next_tool: nextTool,
      switched_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Tool switch log request failed.");
  }
}

function enqueueQuickEvaluation(config) {
  if (!quickEvaluationPopup || !quickEvaluationQuestion || !quickEvaluationOptions) return;

  evaluationQueue.push({
    ...config,
    timestamp: new Date().toISOString(),
  });

  if (!activeEvaluation) showNextQuickEvaluation();
}

function showNextQuickEvaluation() {
  activeEvaluation = evaluationQueue.shift() || null;
  if (!activeEvaluation) {
    quickEvaluationPopup.classList.add("hidden");
    return;
  }

  quickEvaluationQuestion.textContent = activeEvaluation.question || "Quick evaluation";
  quickEvaluationOptions.innerHTML = "";
  if (Array.isArray(activeEvaluation.questions)) {
    quickEvaluationOptions.innerHTML = `
      <form id="quick-evaluation-form" class="quick-evaluation-form">
        ${activeEvaluation.questions
          .map(
            (question) => `
              <fieldset class="quick-evaluation-fieldset">
                <legend>${escapeHtml(question.text)}</legend>
                <div class="quick-evaluation-rating-row">
                  ${createRatingOptions()
                    .map(
                      (option) => `
                        <label>
                          <input type="radio" name="${escapeHtml(question.id)}" value="${option.value}" required />
                          <span>${option.label}</span>
                        </label>
                      `
                    )
                    .join("")}
                </div>
              </fieldset>
            `
          )
          .join("")}
        <button class="quick-evaluation-submit" type="submit">Submit</button>
      </form>
    `;
    document.getElementById("quick-evaluation-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const ratings = {};
      activeEvaluation.questions.forEach((question) => {
        const selected = event.target.querySelector(`input[name="${question.id}"]:checked`);
        if (selected) ratings[question.id] = Number(selected.value);
      });
      if (Object.keys(ratings).length !== activeEvaluation.questions.length) return;
      submitQuickEvaluation(ratings);
    });
  } else {
    activeEvaluation.options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "quick-evaluation-option";
      button.type = "button";
      button.textContent = option.label;
      button.addEventListener("click", () => submitQuickEvaluation(option.value));
      quickEvaluationOptions.appendChild(button);
    });
  }

  quickEvaluationPopup.classList.remove("hidden");
}

async function submitQuickEvaluation(value) {
  if (!activeEvaluation) return;

  const evaluation = activeEvaluation;
  activeEvaluation = null;
  quickEvaluationPopup.classList.add("hidden");

  const responsePayload = {
    userId: currentUserId,
    week: getActiveEvaluationWeek(),
    weekId: getActiveEvaluationWeek(),
    session: getActiveEvaluationSession(),
    sessionId,
    tool: evaluation.tool,
    toolType: evaluation.tool,
    eventType: evaluation.eventType,
    timestamp: evaluation.timestamp,
    ...(evaluation.metadata || {}),
  };
  if (Array.isArray(evaluation.questions)) {
    responsePayload.ratings = value;
    responsePayload.sourceType = evaluation.sourceType;
  } else {
    responsePayload[evaluation.responseKey] = value;
  }

  try {
    await logQuickEvaluationToElasticsearch(responsePayload);
    await saveQuickEvaluation(currentUserId, responsePayload);
  } catch (error) {
    console.error("Quick evaluation save failed:", error);
  } finally {
    showNextQuickEvaluation();
  }
}

async function logQuickEvaluationToElasticsearch(payload) {
  const response = await fetch("/api/evaluation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: payload.userId,
      session_id: payload.sessionId,
      week: payload.week,
      week_id: payload.weekId || payload.week,
      session: payload.session,
      tool: payload.tool,
      tool_type: payload.toolType || payload.tool,
      source_type: payload.sourceType || "",
      evaluation_event_type: payload.eventType,
      rating: payload.rating,
      ratings: payload.ratings || null,
      reason: payload.reason,
      evaluation_timestamp: payload.timestamp,
      query_text: payload.queryText || "",
      clicked_url: payload.clickedUrl || "",
      url: payload.clickedUrl || "",
      clicked_rank: payload.clickedRank ?? null,
      chat_question: payload.chatQuestion || "",
      chat_answer: payload.chatAnswer || "",
      prompt: payload.chatQuestion || payload.queryText || "",
      response_id: payload.responseId || "",
      previous_tool: payload.previousTool || "",
      next_tool: payload.nextTool || "",
      returned_at: payload.returnedAt || "",
      time_away_ms: payload.timeAwayMs ?? null,
      result_count: payload.resultCount ?? null,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Evaluation log request failed.");
  }
}

function dismissQuickEvaluation() {
  activeEvaluation = null;
  quickEvaluationPopup.classList.add("hidden");
  showNextQuickEvaluation();
}

function createRatingOptions() {
  return [1, 2, 3, 4, 5].map((rating) => ({
    label: String(rating),
    value: rating,
  }));
}

function getActiveEvaluationWeek() {
  return weekFlowState.weekId || dashboardState.currentWeek || "";
}

function getActiveEvaluationSession() {
  if (activeLearningSession) return activeLearningSession.sessionKey;
  const currentSession = dashboardState.currentSession === "session1" ? "session1" : "session2";
  return getSessionKey(getActiveEvaluationWeek(), currentSession);
}

async function tryLogReturnEvent() {
  if (!pendingReturnContext || !leftMainPageAt || returnLogged) return;

  returnLogged = true;
  const returnContext = { ...pendingReturnContext };
  pendingReturnContext = null;
  const returnedAt = new Date();
  const timeAwayMs = returnedAt.getTime() - leftMainPageAt.getTime();
  if (timeAwayMs < 0) { leftMainPageAt = null; return; }

  try {
    const response = await fetch("/api/return", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUserId,
        session_id: sessionId,
        query_text: returnContext.query_text,
        clicked_url: returnContext.clicked_url,
        clicked_rank: returnContext.clicked_rank,
        left_main_page_at: leftMainPageAt.toISOString(),
        returned_to_main_page_at: returnedAt.toISOString(),
        time_away_ms: timeAwayMs,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Return log request failed.");
    }

    leftMainPageAt = null;
    enqueueQuickEvaluation({
      eventType: "browser_result_returned",
      tool: "browser",
      sourceType: "web_page",
      questions: [
        { id: "newInformation", text: "How much new information did you find on this page?" },
        { id: "readability", text: "How easy was it to read?" },
        { id: "learning", text: "How much did you learn from this page?" },
      ],
      metadata: {
        queryText: returnContext.query_text,
        clickedUrl: returnContext.clicked_url,
        clickedRank: returnContext.clicked_rank,
        returnedAt: returnedAt.toISOString(),
        timeAwayMs,
      },
    });
  } catch (error) {
    console.error("Return log failed:", error);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
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
  if (code === "auth/email-already-in-use")
    return "This email is already registered. Try logging in instead.";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password")
    return "The email or password is incorrect.";
  if (code === "auth/user-not-found")
    return "No account was found for this email.";
  if (code === "auth/weak-password")
    return "Password is too weak. Use at least 6 characters.";
  if (code === "auth/too-many-requests")
    return "Too many attempts. Please wait and try again.";
  return error && error.message ? error.message : "Authentication failed.";
}

// ── Onboarding Logic ──────────────────────────────────────────────────────────
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
      "This onboarding module introduces the study and collects setup information.";
    onboardingNext.textContent = "Start Onboarding";
    onboardingContent.innerHTML = `
      <section class="onboarding-section">
        <div class="onboarding-panel">
          <p class="onboarding-copy">
            Week 0 is the setup and preparation phase for this longitudinal learning study.
            You will review a consent placeholder, complete a short background form, preview the
            baseline quiz framework.
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
          <p class="onboarding-copy">Placeholder study consent text.</p>
          <p class="onboarding-copy">Placeholder privacy and participation statement.</p>
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
            <label for="gender">Gender</label>
            <select id="gender">
              ${renderSelectOptions(
                ["", "Female", "Male", "Non-binary", "Prefer not to share"],
                onboardingState.demographics.gender,
                "Select gender"
              )}
            </select>
          </div>
          <div class="field-group">
            <label for="age">Age</label>
            <select id="age">
              ${renderAgeOptions(onboardingState.demographics.age)}
            </select>
          </div>
          <div class="field-group full-width">
            <label for="education-level">Education</label>
            <select id="education-level">
              ${renderSelectOptions(
                ["", ...EDUCATION_OPTIONS],
                onboardingState.demographics.educationLevel,
                "Select education"
              )}
            </select>
          </div>
          <div class="field-group">
            <label for="native-language-english">Is your native language English?</label>
            <select id="native-language-english">
              ${renderSelectOptions(
                ["", "Yes", "No"],
                onboardingState.demographics.nativeLanguageEnglish,
                "Select one"
              )}
            </select>
          </div>
          <div class="field-group" id="english-learning-age-group">
            <label for="english-learning-start-age">At what age did you start learning English?</label>
            <select id="english-learning-start-age">
              ${renderAgeOptions(onboardingState.demographics.englishLearningStartAge)}
            </select>
          </div>
          <div class="field-group full-width">
            <label for="search-engine-use-frequency">Search engine use frequency</label>
            <select id="search-engine-use-frequency">
              ${renderSelectOptions(
                ["", ...FREQUENCY_OPTIONS],
                onboardingState.demographics.searchEngineUseFrequency,
                "Select frequency"
              )}
            </select>
          </div>
          <div class="field-group full-width">
            <label for="conversational-ai-use-frequency">Conversational AI tool use frequency</label>
            <select id="conversational-ai-use-frequency">
              ${renderSelectOptions(
                ["", ...FREQUENCY_OPTIONS],
                onboardingState.demographics.conversationalAiUseFrequency,
                "Select frequency"
              )}
            </select>
          </div>
        </div>
      </section>
    `;

    const nativeLanguageSelect = document.getElementById("native-language-english");
    const englishAgeGroup = document.getElementById("english-learning-age-group");
    const updateEnglishAgeVisibility = () => {
      englishAgeGroup.classList.toggle("hidden", nativeLanguageSelect.value !== "No");
    };
    nativeLanguageSelect.addEventListener("change", updateEnglishAgeVisibility);
    updateEnglishAgeVisibility();
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
                              ${onboardingState.quizAnswers[question.id] === option ? "checked" : ""}
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

  // Complete step
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
          and baseline framework data have been stored for the next stage.
        </p>
      </div>
    </section>
  `;
}

function readAndValidateCurrentStep() {
  if (onboardingState.step === "welcome") return "";

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
      gender: document.getElementById("gender").value,
      age: document.getElementById("age").value,
      educationLevel: document.getElementById("education-level").value,
      nativeLanguageEnglish: document.getElementById("native-language-english").value,
      englishLearningStartAge: document.getElementById("english-learning-start-age").value,
      searchEngineUseFrequency: document.getElementById("search-engine-use-frequency").value,
      conversationalAiUseFrequency: document.getElementById("conversational-ai-use-frequency").value,
    };

    if (
      !onboardingState.demographics.gender ||
      !onboardingState.demographics.age ||
      !onboardingState.demographics.educationLevel ||
      !onboardingState.demographics.nativeLanguageEnglish ||
      !onboardingState.demographics.searchEngineUseFrequency ||
      !onboardingState.demographics.conversationalAiUseFrequency
    ) {
      return "Please complete all required demographic fields.";
    }
    if (
      onboardingState.demographics.nativeLanguageEnglish === "No" &&
      !onboardingState.demographics.englishLearningStartAge
    ) {
      return "Please select the age when you started learning English.";
    }
    if (onboardingState.demographics.nativeLanguageEnglish === "Yes") {
      onboardingState.demographics.englishLearningStartAge = "";
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
}

// ── Week Flow Validation & Persistence ───────────────────────────────────────
function readAndValidateWeekStep() {
  const nextGoals = weekFlowState.subgoals.map((_goal, index) => ({
    order: index + 1,
    question: document.getElementById(`weekly-goal-question-${index}`).value.trim(),
    status: "not_started",
  }));

  if (!nextGoals[0].question) return "Please complete Goal 1 before continuing.";

  weekFlowState.subgoals = nextGoals;
  return "";
}

async function persistWeekFlowState() {
  const weekId = weekFlowState.weekId;
  const currentWeek = dashboardState.weeks[weekId];

  const payload = {
    ...currentWeek,
    subgoalsCompleted: true,
    subgoals: weekFlowState.subgoals,
    goalPlanning: {
      ...(currentWeek.goalPlanning || {}),
      [getSessionKey(weekId, "session2")]: {
        weekId,
        sessionId: getSessionKey(weekId, "session2"),
        goals: weekFlowState.subgoals,
        learningGoalStatement: getLearningGoalStatement(weekId),
        submittedAt: new Date().toISOString(),
      },
    },
    sessions: upsertWeekSession(currentWeek, weekId, "session2", {
      status: "in_progress",
      goalPlanningCompleted: true,
    }),
  };

  dashboardState.weeks[weekId] = payload;
  await saveUserWeek(currentUserId, weekId, payload);
}

// ── Learning Session Completion / Outcome Flow ───────────────────────────────
async function beginLearningSession(weekId, sessionType) {
  const now = new Date().toISOString();
  const weekState = dashboardState.weeks[weekId] || {};
  const sessionKey = getSessionKey(weekId, sessionType);
  const sessionPatch = {
    status: "in_progress",
    learningStartedAt: getWeekSessionState(weekState, weekId, sessionType).learningStartedAt || now,
  };
  if (sessionType === "session1") sessionPatch.videoCompleted = true;
  if (sessionType === "session2") sessionPatch.goalPlanningCompleted = true;

  activeLearningSession = { weekId, sessionType, sessionKey };
  dashboardState.currentWeek = weekId;
  dashboardState.currentSession = sessionType;
  dashboardState.weeks[weekId] = {
    ...weekState,
    status: "in_progress",
    structuredStatus: sessionType === "session1" ? "in_progress" : weekState.structuredStatus,
    exploratoryStatus: sessionType === "session2" ? "in_progress" : weekState.exploratoryStatus,
    structuredStep: sessionType === "session1" ? "learning" : weekState.structuredStep,
    sessions: upsertWeekSession(weekState, weekId, sessionType, sessionPatch),
  };

  await saveUserStudyProfile(currentUserId, {
    currentWeek: dashboardState.currentWeek,
    currentSession: dashboardState.currentSession,
    assignedCondition: dashboardState.assignedCondition,
    weekProgress: summarizeWeekProgress(),
  });
  await saveUserWeek(currentUserId, weekId, dashboardState.weeks[weekId]);
  showAppView();
}

async function completeLearningSession() {
  if (!activeLearningSession) return;
  stopCountdown();
  const { weekId, sessionType, sessionKey } = activeLearningSession;
  const now = new Date().toISOString();
  const weekState = dashboardState.weeks[weekId] || {};

  dashboardState.weeks[weekId] = {
    ...weekState,
    structuredStep: sessionType === "session1" ? "outcome" : weekState.structuredStep,
    sessions: upsertWeekSession(weekState, weekId, sessionType, {
      status: "in_progress",
      learningCompletedAt: now,
    }),
  };
  await saveUserWeek(currentUserId, weekId, dashboardState.weeks[weekId]);
  learningOutcomeState = {
    weekId,
    sessionKey,
    step: "summary",
    summary: "",
    wordCount: 0,
    answers: {},
  };
  showLearningOutcomeView();
}

function renderLearningOutcomeStep() {
  const weekLabel = formatWeekLabel(learningOutcomeState.weekId);
  learningOutcomeEyebrow.textContent = `${weekLabel} · ${formatSessionNumber(learningOutcomeState.sessionKey)} Outcome`;
  learningOutcomeValidation.textContent = "";

  if (learningOutcomeState.step === "summary") {
    learningOutcomeTitle.textContent = "Learning Summary";
    learningOutcomeSubtitle.textContent = "Write at least 50 words before continuing.";
    learningOutcomeNext.textContent = "Submit Summary";
    learningOutcomeContent.innerHTML = `
      <section class="onboarding-section">
        <div class="field-group full-width">
          <label for="learning-summary">Please summarize what you learned today.</label>
          <textarea id="learning-summary" rows="10" placeholder="Write your summary here...">${escapeHtml(learningOutcomeState.summary)}</textarea>
          <span class="scale-value"><strong id="learning-summary-word-count">${learningOutcomeState.wordCount}</strong> / 50 words minimum</span>
        </div>
      </section>
    `;
    const textarea = document.getElementById("learning-summary");
    const count = document.getElementById("learning-summary-word-count");
    textarea.addEventListener("input", () => {
      count.textContent = String(countWords(textarea.value));
    });
    return;
  }

  learningOutcomeTitle.textContent = "Comprehension Questions";
  learningOutcomeSubtitle.textContent =
    "Placeholder questions are shown now. The component can later load real questions from Firestore.";
  learningOutcomeNext.textContent = "Submit Outcome";
  learningOutcomeContent.innerHTML = `
    <section class="onboarding-section">
      <div class="quiz-list">
        ${PLACEHOLDER_OUTCOME_QUESTIONS.map((question, index) =>
          renderOutcomeQuestionCard(question, index)
        ).join("")}
      </div>
    </section>
  `;
}

async function readAndPersistLearningOutcomeStep() {
  if (learningOutcomeState.step === "summary") {
    const summary = document.getElementById("learning-summary").value.trim();
    const wordCount = countWords(summary);
    if (wordCount < 50) return "Please write at least 50 words before continuing.";
    learningOutcomeState.summary = summary;
    learningOutcomeState.wordCount = wordCount;
    return "";
  }

  const answers = {};
  for (const question of PLACEHOLDER_OUTCOME_QUESTIONS) {
    const selected = document.querySelector(`input[name="${question.id}"]:checked`);
    if (!selected) return "Please answer all comprehension questions before submitting.";
    answers[question.id] = selected.value;
  }
  learningOutcomeState.answers = answers;
  return "";
}

function renderOutcomeQuestionCard(question, index) {
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
                  ${learningOutcomeState.answers[question.id] === option ? "checked" : ""}
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

async function finalizeLearningOutcome() {
  const { weekId, sessionKey, summary, wordCount, answers } = learningOutcomeState;
  const sessionType = sessionKey.endsWith("_session1") ? "session1" : "session2";
  const weekState = dashboardState.weeks[weekId] || {};
  const now = new Date().toISOString();

  await saveLearningOutcome(currentUserId, {
    summary,
    wordCount,
    comprehensionAnswers: answers,
    sessionId: sessionKey,
    weekId,
    userId: currentUserId,
  });

  dashboardState.weeks[weekId] = {
    ...weekState,
    structuredStatus: sessionType === "session1" ? "completed" : weekState.structuredStatus,
    exploratoryStatus: sessionType === "session2" ? "completed" : weekState.exploratoryStatus,
    structuredStep: sessionType === "session1" ? "completed" : weekState.structuredStep,
    structuredCompletedAt: sessionType === "session1" ? now : weekState.structuredCompletedAt,
    exploratoryCompletedAt: sessionType === "session2" ? now : weekState.exploratoryCompletedAt,
    sessionsCompleted: sessionType === "session2" ? true : weekState.sessionsCompleted,
    status: isWeekCompleteById(weekId, {
      ...weekState,
      structuredStatus: sessionType === "session1" ? "completed" : weekState.structuredStatus,
      exploratoryStatus: sessionType === "session2" ? "completed" : weekState.exploratoryStatus,
    })
      ? "completed"
      : weekState.status,
    sessions: upsertWeekSession(weekState, weekId, sessionType, {
      status: "completed",
      learningOutcomeCompleted: true,
      updatedAt: now,
    }),
  };
  await saveUserWeek(currentUserId, weekId, dashboardState.weeks[weekId]);
  activeLearningSession = null;
  learningOutcomeState = { weekId: "", sessionKey: "", step: "summary", summary: "", wordCount: 0, answers: {} };
  await loadDashboardState();
  showDashboardView();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function setOnboardingStep(step) {
  onboardingState.step = step;
  renderOnboardingStep();
}

function attachScaleMirror(inputId, valueId) {
  const input = document.getElementById(inputId);
  const value = document.getElementById(valueId);
  if (!input || !value) return;
  input.addEventListener("input", () => { value.textContent = input.value; });
}

function renderSelectOptions(options, selectedValue, placeholder) {
  const rendered = [];
  if (placeholder) {
    rendered.push(
      `<option value="" ${selectedValue ? "" : "selected"} disabled>${escapeHtml(placeholder)}</option>`
    );
  }
  options.forEach((option) => {
    if (!option) return;
    rendered.push(
      `<option value="${escapeHtml(option)}" ${option === selectedValue ? "selected" : ""}>${escapeHtml(option)}</option>`
    );
  });
  return rendered.join("");
}

function renderAgeOptions(selectedValue) {
  const ages = Array.from({ length: 68 }, (_, index) => String(index + 18));
  return renderSelectOptions(["", ...ages], String(selectedValue || ""), "Select age");
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getSessionKey(weekId, sessionType) {
  return `${weekId}_${sessionType}`;
}

function formatSessionLabel(weekId, sessionType) {
  return `${formatWeekLabel(weekId)} ${sessionType === "session1" ? "Session 1" : "Session 2"}`;
}

function formatSessionNumber(sessionKey) {
  return sessionKey.endsWith("_session1") ? "Session 1" : "Session 2";
}

function getLearningGoalStatement(weekId) {
  // TODO: Load real learning goal statements from Firestore when Adrian and Kylie provide them.
  return PLACEHOLDER_LEARNING_GOALS[weekId] || "Placeholder learning goal statement.";
}

function createDefaultSessionProgress(weekId, sessionType) {
  return {
    sessionId: getSessionKey(weekId, sessionType),
    status: "not_started",
    videoCompleted: sessionType === "session1" ? false : null,
    goalPlanningCompleted: sessionType === "session2" ? false : null,
    learningStartedAt: null,
    learningCompletedAt: null,
    learningOutcomeCompleted: false,
    updatedAt: null,
  };
}

function normalizeWeekSessions(weekState, weekId) {
  const existing = weekState.sessions && !Array.isArray(weekState.sessions) ? weekState.sessions : {};
  return {
    [getSessionKey(weekId, "session1")]: {
      ...createDefaultSessionProgress(weekId, "session1"),
      ...(existing[getSessionKey(weekId, "session1")] || {}),
    },
    [getSessionKey(weekId, "session2")]: {
      ...createDefaultSessionProgress(weekId, "session2"),
      ...(existing[getSessionKey(weekId, "session2")] || {}),
    },
  };
}

function getWeekSessionState(weekState, weekId, sessionType) {
  return normalizeWeekSessions(weekState || {}, weekId)[getSessionKey(weekId, sessionType)];
}

function upsertWeekSession(weekState, weekId, sessionType, patch) {
  const sessions = normalizeWeekSessions(weekState || {}, weekId);
  const key = getSessionKey(weekId, sessionType);
  sessions[key] = {
    ...sessions[key],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  return sessions;
}

function isSessionComplete(weekId, weekState, sessionType) {
  const sessionState = getWeekSessionState(weekState || {}, weekId, sessionType);
  if (sessionState.learningOutcomeCompleted || sessionState.status === "completed") return true;
  if (sessionType === "session1") return weekState?.structuredStatus === "completed";
  return weekState?.exploratoryStatus === "completed" || Boolean(weekState?.sessionsCompleted);
}

// ── Default State Factories ───────────────────────────────────────────────────
function createDefaultSubgoals() {
  return [createDefaultSubgoal(1), createDefaultSubgoal(2), createDefaultSubgoal(3)];
}

function createDefaultSubgoal(index) {
  return { order: index, question: "", type: "Concept", importance: "4", confidence: "4" };
}

// Default week state includes both the new session-status fields and the
// existing fields used by the exploratory session / app-shell.
function createDefaultWeeks() {
  return weekDefinitions.reduce((acc, week) => {
    acc[week.id] = {
      // New per-session status fields (8-session model)
      structuredStatus: "not_started",
      exploratoryStatus: "not_started",
      structuredStep: "video",
      structuredCompletedAt: null,
      exploratoryStartedAt: null,
      exploratoryCompletedAt: null,
      // Legacy fields used by the exploratory session app-shell flow
      status: "not_started",
      delayedTestCompleted: week.id === "week1",
      subgoalsCompleted: false,
      sessionsCompleted: false,
      delayedTestAnswers: {},
      subgoals: createDefaultWeekSubgoals(),
      currentSessionIndex: 0,
      sessionTimeRemaining: 25 * 60,
      sessions: {
        [getSessionKey(week.id, "session1")]: createDefaultSessionProgress(week.id, "session1"),
        [getSessionKey(week.id, "session2")]: createDefaultSessionProgress(week.id, "session2"),
      },
    };
    return acc;
  }, {});
}

function createDefaultWeekSubgoals() {
  return [
    createDefaultWeekSubgoal(1),
    createDefaultWeekSubgoal(2),
    createDefaultWeekSubgoal(3),
  ];
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

// ── State Reset ───────────────────────────────────────────────────────────────
function resetOnboardingState() {
  onboardingState.step = "welcome";
  onboardingState.completed = false;
  onboardingState.consentAgreed = false;
  onboardingState.demographics = {
    gender: "",
    age: "",
    educationLevel: "",
    nativeLanguageEnglish: "",
    englishLearningStartAge: "",
    searchEngineUseFrequency: "",
    conversationalAiUseFrequency: "",
  };
  onboardingState.quizAnswers = {};
  onboardingState.subgoals = createDefaultSubgoals();
}

function resetDashboardState() {
  dashboardState.assignedCondition = "Condition not assigned yet";
  dashboardState.currentWeek = "week1";
  dashboardState.currentSession = "structured";
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

function resetResearchToolState() {
  researchToolStateVersion += 1;
  currentQuery = "";
  chatHistory.length = 0;
  searchNextStart = 0;
  searchHasMore = false;
  searchLoadingMore = false;
  pendingReturnContext = null;
  leftMainPageAt = null;
  returnLogged = false;
  activeEvaluation = null;
  evaluationQueue.length = 0;

  if (queryInput) queryInput.value = "";
  if (chatInput) chatInput.value = "";
  if (resultsContainer) resultsContainer.innerHTML = "";
  if (chatMessages) chatMessages.innerHTML = "";
  if (statusMessage) statusMessage.textContent = "";
  if (keywordList) {
    keywordList.innerHTML =
      '<span class="keyword-empty">Search for something to extract keywords.</span>';
  }
  if (quickEvaluationPopup) quickEvaluationPopup.classList.add("hidden");
  setActiveTool("browser", { logSwitch: false, promptReason: false });
}

// ── Week Completion / Unlocking ───────────────────────────────────────────────

// A week is fully complete when BOTH sessions are done.
// Also checks the legacy sessionsCompleted field for backward compatibility.
function isWeekComplete(weekState) {
  const weekId = weekDefinitions.find(
    (week) => dashboardState.weeks[week.id] === weekState || weekState?.sessions?.[getSessionKey(week.id, "session1")]
  )?.id;
  if (!weekId) return false;
  return isSessionComplete(weekId, weekState, "session1") && isSessionComplete(weekId, weekState, "session2");
}

function isWeekCompleteById(weekId, weekState) {
  return isSessionComplete(weekId, weekState || {}, "session1") && isSessionComplete(weekId, weekState || {}, "session2");
}

// Week 1 is always unlocked. Later weeks unlock when the previous week is fully complete.
function isWeekUnlocked(weekId) {
  const currentIndex = weekDefinitions.findIndex((w) => w.id === weekId);
  if (currentIndex <= 0) return true;
  const previousWeekId = weekDefinitions[currentIndex - 1].id;
  return isWeekCompleteById(previousWeekId, dashboardState.weeks[previousWeekId] || {});
}

function countCompletedWeeks() {
  return weekDefinitions.filter((week) =>
    isWeekCompleteById(week.id, dashboardState.weeks[week.id])
  ).length;
}

// Human-readable hint for the dashboard progress caption
function getNextSessionDescription() {
  for (const week of weekDefinitions) {
    const state = dashboardState.weeks[week.id];
    if (!isWeekUnlocked(week.id)) continue;
    if (!isSessionComplete(week.id, state, "session1")) {
      return formatSessionLabel(week.id, "session1");
    }
    if (!isSessionComplete(week.id, state, "session2")) {
      return formatSessionLabel(week.id, "session2");
    }
  }
  return "All sessions complete";
}

function inferCurrentWeek(weekData) {
  // Prefer a week that has an in-progress required session.
  const active = weekDefinitions.find(
    (week) =>
      weekData[week.id] &&
      (weekData[week.id].structuredStatus === "in_progress" ||
        weekData[week.id].exploratoryStatus === "in_progress" ||
        weekData[week.id].status === "in_progress")
  );
  if (active) return active.id;

  const next = weekDefinitions.find((week) => !isWeekCompleteById(week.id, weekData[week.id] || {}));
  return next ? next.id : weekDefinitions[weekDefinitions.length - 1].id;
}

function getDelayedTestQuestions(weekId) {
  return delayedTestQuestionsByWeek[weekId] || delayedTestQuestionsByWeek.week2 || [];
}

function formatWeekLabel(weekId) {
  const found = weekDefinitions.find((week) => week.id === weekId);
  return found ? found.label : weekId;
}

function summarizeWeekProgress() {
  return weekDefinitions.reduce((acc, week) => {
    const weekState = dashboardState.weeks[week.id];
    acc[week.id] = {
      structuredStatus: weekState.structuredStatus || "not_started",
      exploratoryStatus: weekState.exploratoryStatus || "not_started",
      sessions: normalizeWeekSessions(weekState, week.id),
      status: weekState.status,
      delayedTestCompleted: weekState.delayedTestCompleted,
      subgoalsCompleted: weekState.subgoalsCompleted,
    };
    return acc;
  }, {});
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
