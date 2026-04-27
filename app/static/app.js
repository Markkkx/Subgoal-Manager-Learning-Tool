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
  saveWeek0Subgoals,
  saveUserWeek,
  getPostTestQuestions,
  savePostTest,
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
// Exploratory session shell (delayed test + subgoal planning)
const weekShell = document.getElementById("week-shell");
const weekShellEyebrow = document.getElementById("week-shell-eyebrow");
const weekShellTitle = document.getElementById("week-shell-title");
const weekShellSubtitle = document.getElementById("week-shell-subtitle");
const weekShellContent = document.getElementById("week-shell-content");
const weekShellValidation = document.getElementById("week-shell-validation");
const weekShellBack = document.getElementById("week-shell-back");
const weekShellNext = document.getElementById("week-shell-next");
// Structured session shell (instructions + placeholder assessment)
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

const weekDefinitions = [
  { id: "week1", label: "Week 1" },
  { id: "week2", label: "Week 2" },
  { id: "week3", label: "Week 3" },
  { id: "week4", label: "Week 4" },
];

const onboardingSteps = ["welcome", "consent", "demographics", "quiz", "subgoals", "complete"];

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
  currentSession: "structured", // "structured" | "exploratory"
  weeks: createDefaultWeeks(),
};

// State for the exploratory session pre-flow (delayed test + subgoal planning)
const weekFlowState = {
  weekId: "",
  step: "",           // "delayedTest" | "subgoals"
  delayedTestAnswers: {},
  subgoals: createDefaultWeekSubgoals(),
  currentSessionIndex: 0,
  sessionTimeRemaining: 25 * 60,
};

// State for the structured session flow
const structuredSessionState = {
  weekId: "",
  step: "instructions", // "instructions" | "assessment"
  materialsChecked: false,
  assessmentAnswers: {},
};

// Placeholder structured assessment questions.
// Replace prompts and options with real content when ready.
const STRUCTURED_ASSESSMENT_QUESTIONS = [
  {
    id: "sa_q1",
    type: "singleChoice",
    prompt: "[Placeholder] Which of the following best describes the key concept from this week's materials?",
    options: [
      "Option A — Placeholder",
      "Option B — Placeholder",
      "Option C — Placeholder",
      "Option D — Placeholder",
    ],
  },
  {
    id: "sa_q2",
    type: "shortAnswer",
    prompt: "[Placeholder] In 2–3 sentences, summarize the main idea from the materials you watched this week.",
  },
  {
    id: "sa_q3",
    type: "singleChoice",
    prompt: "[Placeholder] Which approach is most aligned with the learning objectives for this week?",
    options: [
      "Approach A — Placeholder",
      "Approach B — Placeholder",
      "Approach C — Placeholder",
      "Approach D — Placeholder",
    ],
  },
];

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

  currentQuery = queryText;
  statusMessage.textContent = "Searching...";
  resultsContainer.innerHTML = "";

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUserId,
        session_id: sessionId,
        query_text: queryText,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Search request failed.");

    renderResults(data.results);
    renderKeywords(data.keywords || []);
    statusMessage.textContent = `Showing ${data.results.length} result(s) for "${queryText}".`;
    enqueueQuickEvaluation({
      eventType: "browser_search_results_loaded",
      tool: "browser",
      question: "How helpful were these results?",
      responseKey: "rating",
      options: createRatingOptions(),
    });
  } catch (error) {
    renderEmptyState("The search could not be completed.");
    renderKeywords([]);
    statusMessage.textContent = error.message;
  }
});

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

    appendChatMessage("assistant", data.reply);
    chatHistory.push({ role: "assistant", content: data.reply });
    enqueueQuickEvaluation({
      eventType: "chatbot_answer_shown",
      tool: "ai_chat",
      question: "How useful was this answer?",
      responseKey: "rating",
      options: createRatingOptions(),
    });
  } catch (error) {
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

// ── Exploratory Session Shell Navigation ─────────────────────────────────────
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

  // Subgoal step done — enter main research page
  const currentWeek = dashboardState.weeks[weekFlowState.weekId];
  currentWeek.subgoalsCompleted = true;
  currentWeek.status = "in_progress";
  currentWeek.exploratoryStatus = "in_progress";
  currentWeek.subgoals = weekFlowState.subgoals;
  currentWeek.exploratoryStartedAt = currentWeek.exploratoryStartedAt || new Date().toISOString();
  dashboardState.currentWeek = weekFlowState.weekId;
  dashboardState.currentSession = "exploratory";

  await saveUserStudyProfile(currentUserId, {
    currentWeek: dashboardState.currentWeek,
    currentSession: dashboardState.currentSession,
    assignedCondition: dashboardState.assignedCondition,
    weekProgress: summarizeWeekProgress(),
  });
  await saveUserWeek(currentUserId, weekFlowState.weekId, currentWeek);

  const savedSubgoals = weekFlowState.subgoals;
  const savedWeekId = weekFlowState.weekId;
  resetWeekFlowState();
  weekFlowState.subgoals = savedSubgoals;
  weekFlowState.weekId = savedWeekId;
  weekFlowState.currentSessionIndex = 0;
  weekFlowState.sessionTimeRemaining = 25 * 60;
  showAppView();
});

// ── Structured Session Shell Navigation ───────────────────────────────────────
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

  if (structuredSessionState.step === "instructions") {
    // Advance to assessment and save progress for resume
    structuredSessionState.step = "assessment";
    dashboardState.weeks[structuredSessionState.weekId] = {
      ...dashboardState.weeks[structuredSessionState.weekId],
      structuredStatus: "in_progress",
      structuredStep: "assessment",
    };
    await saveUserWeek(currentUserId, structuredSessionState.weekId, dashboardState.weeks[structuredSessionState.weekId]);
    renderStructuredSessionStep();
    return;
  }

  if (structuredSessionState.step === "assessment") {
    // Save answers alongside the week doc (avoids sub-collection permission issues)
    const weekId = structuredSessionState.weekId;
    dashboardState.weeks[weekId] = {
      ...dashboardState.weeks[weekId],
      structuredStatus: "completed",
      structuredStep: "completed",
      structuredCompletedAt: new Date().toISOString(),
      structuredAssessmentAnswers: structuredSessionState.assessmentAnswers,
    };
    await saveUserWeek(currentUserId, weekId, dashboardState.weeks[weekId]);

    // Reset state and go back to dashboard
    structuredSessionState.weekId = "";
    structuredSessionState.step = "instructions";
    structuredSessionState.materialsChecked = false;
    structuredSessionState.assessmentAnswers = {};

    await loadDashboardState();
    showDashboardView();
  }
});

// ── Auth State Listener ───────────────────────────────────────────────────────
onAuthReady((user) => {
  if (!user) {
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
  appShell.classList.remove("hidden");
  startCountdown(weekFlowState.sessionTimeRemaining);
  renderSubgoalSidebar();
  renderSessionIndicator();
}

function showPostTestView() {
  hideAllShells();
  postTestShell.classList.remove("hidden");
}

// ── Auth Handler ──────────────────────────────────────────────────────────────
async function handleAuthenticatedUser(user) {
  resetOnboardingState();
  resetDashboardState();
  resetWeekFlowState();
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
              <h4>Structured Session</h4>
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
              <h4>Exploratory Session</h4>
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
  const structuredStatus = weekState.structuredStatus || "not_started";

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
      description: "You have completed this week's structured session.",
      completed: true,
      locked: false,
    };
  }

  if (structuredStatus === "in_progress") {
    return {
      statusLabel: "In Progress",
      statusClass: "status-in-progress",
      buttonLabel: "Resume Structured Session",
      description: "Continue where you left off in the structured session.",
      completed: false,
      locked: false,
    };
  }

  return {
    statusLabel: "Not Started",
    statusClass: "status-not-started",
    buttonLabel: "Start Structured Session",
    description: "Watch the assigned lecture materials, then complete the assessment.",
    completed: false,
    locked: false,
  };
}

function getExploratorySessionAction(weekId, weekState) {
  const weekUnlocked = isWeekUnlocked(weekId);
  const structuredDone = weekState.structuredStatus === "completed";
  const exploratoryStatus = weekState.exploratoryStatus || "not_started";

  // Locked if the week itself is locked or structured session not yet done
  if (!weekUnlocked || !structuredDone) {
    return {
      statusLabel: "Locked",
      statusClass: "status-locked",
      buttonLabel: "Locked",
      description: structuredDone
        ? `Complete ${formatWeekLabel(weekDefinitions[weekDefinitions.findIndex((w) => w.id === weekId) - 1]?.id)} first.`
        : "Complete the Structured Session for this week first.",
      completed: false,
      locked: true,
    };
  }

  if (exploratoryStatus === "completed") {
    return {
      statusLabel: "Completed",
      statusClass: "status-completed",
      buttonLabel: "Completed",
      description: "You have completed this week's exploratory session.",
      completed: true,
      locked: false,
    };
  }

  if (exploratoryStatus === "in_progress") {
    return {
      statusLabel: "In Progress",
      statusClass: "status-in-progress",
      buttonLabel: "Resume Exploratory Session",
      description: "Continue where you left off in the research page.",
      completed: false,
      locked: false,
    };
  }

  return {
    statusLabel: "Not Started",
    statusClass: "status-not-started",
    buttonLabel: "Start Exploratory Session",
    description:
      weekId === "week1"
        ? "Set your sub-goals, then begin the research session."
        : "Start with a short delayed test, then set sub-goals and begin research.",
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

// ── Structured Session ────────────────────────────────────────────────────────

// Entry point: open (or resume) the structured session for a given week.
async function openStructuredSession(weekId) {
  const weekState = dashboardState.weeks[weekId];

  if (!isWeekUnlocked(weekId)) return;
  if (weekState.structuredStatus === "completed") return;

  structuredSessionState.weekId = weekId;
  structuredSessionState.materialsChecked = false;
  structuredSessionState.assessmentAnswers = {};

  // Resume at the correct step if the user left mid-way
  if (weekState.structuredStatus === "in_progress" && weekState.structuredStep === "assessment") {
    structuredSessionState.step = "assessment";
  } else {
    structuredSessionState.step = "instructions";
  }

  // Persist in_progress status immediately
  dashboardState.weeks[weekId] = {
    ...weekState,
    structuredStatus: "in_progress",
    structuredStep: structuredSessionState.step,
  };
  await saveUserWeek(currentUserId, weekId, dashboardState.weeks[weekId]);

  showStructuredSessionView();
  renderStructuredSessionStep();
}

// Render the current step of the structured session.
function renderStructuredSessionStep() {
  const weekLabel = formatWeekLabel(structuredSessionState.weekId);
  structuredSessionEyebrow.textContent = `${weekLabel} · Structured Session`;
  structuredSessionValidation.textContent = "";

  if (structuredSessionState.step === "instructions") {
    structuredSessionTitle.textContent = "Watch the Learning Materials";
    structuredSessionSubtitle.textContent =
      "Complete the assigned materials before taking the assessment.";
    structuredSessionNext.textContent = "Continue to Assessment";

    structuredSessionContent.innerHTML = `
      <section class="onboarding-section">
        <div class="onboarding-panel">
          <p class="onboarding-copy">
            Please watch the assigned lecture and tutorial materials for
            <strong>${escapeHtml(weekLabel)}</strong> before continuing.
            These materials have been prepared for you and are available outside this website.
          </p>
          <p class="onboarding-copy">
            After you finish watching, check the box below and click
            <strong>Continue to Assessment</strong>.
          </p>
        </div>
        <label class="consent-check">
          <input id="materials-completed-check" type="checkbox"
            ${structuredSessionState.materialsChecked ? "checked" : ""} />
          <span>I have completed the assigned learning materials for this week.</span>
        </label>
      </section>
    `;
    return;
  }

  if (structuredSessionState.step === "assessment") {
    structuredSessionTitle.textContent = "Structured Session Assessment";
    structuredSessionSubtitle.textContent =
      "Answer all questions based on the materials you watched.";
    structuredSessionNext.textContent = "Submit Assessment";

    structuredSessionContent.innerHTML = `
      <section class="onboarding-section">
        <p class="inline-note">
          [Placeholder] Real assessment questions for ${escapeHtml(weekLabel)} will be added here before the study begins.
        </p>
        <div class="quiz-list">
          ${STRUCTURED_ASSESSMENT_QUESTIONS.map((q, i) =>
            renderStructuredQuestionCard(q, i)
          ).join("")}
        </div>
      </section>
    `;
  }
}

// Render one question card for the structured assessment (supports singleChoice + shortAnswer).
function renderStructuredQuestionCard(question, index) {
  if (question.type === "shortAnswer") {
    return `
      <article class="question-card">
        <h3>Question ${index + 1}</h3>
        <p class="onboarding-copy">${escapeHtml(question.prompt)}</p>
        <div class="field-group full-width">
          <label for="${question.id}">Short answer</label>
          <textarea id="${question.id}" placeholder="Type your response here…">${escapeHtml(
            structuredSessionState.assessmentAnswers[question.id] || ""
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
            (opt) => `
          <label>
            <input
              type="radio"
              name="${question.id}"
              value="${escapeHtml(opt)}"
              ${structuredSessionState.assessmentAnswers[question.id] === opt ? "checked" : ""}
            />
            ${escapeHtml(opt)}
          </label>
        `
          )
          .join("")}
      </div>
    </article>
  `;
}

// Validate the current structured session step and collect answers into state.
function readAndValidateStructuredStep() {
  if (structuredSessionState.step === "instructions") {
    const checkbox = document.getElementById("materials-completed-check");
    if (!checkbox || !checkbox.checked) {
      return "Please confirm you have completed the assigned learning materials before continuing.";
    }
    structuredSessionState.materialsChecked = true;
    return "";
  }

  if (structuredSessionState.step === "assessment") {
    const answers = {};
    for (const q of STRUCTURED_ASSESSMENT_QUESTIONS) {
      if (q.type === "shortAnswer") {
        const el = document.getElementById(q.id);
        const val = el ? el.value.trim() : "";
        if (!val) return "Please answer all assessment questions before submitting.";
        answers[q.id] = val;
      } else {
        const selected = document.querySelector(`input[name="${q.id}"]:checked`);
        if (!selected) return "Please answer all assessment questions before submitting.";
        answers[q.id] = selected.value;
      }
    }
    structuredSessionState.assessmentAnswers = answers;
    return "";
  }

  return "";
}

// ── Exploratory Session ───────────────────────────────────────────────────────

// Entry point: open (or resume) the exploratory session for a given week.
// For weeks 2-4 this shows the delayed test first, then subgoal planning.
// For week 1 it goes straight to subgoal planning.
async function openExploratorySession(weekId) {
  const weekState = dashboardState.weeks[weekId];

  // Guard: require week unlocked and structured session completed first
  if (!isWeekUnlocked(weekId)) return;
  if (weekState.structuredStatus !== "completed") return;
  if (weekState.exploratoryStatus === "completed") return;

  // Resume: if subgoals already completed and exploratory is in_progress → skip to app-shell
  if (weekState.subgoalsCompleted && weekState.exploratoryStatus === "in_progress") {
    weekFlowState.weekId = weekId;
    weekFlowState.subgoals =
      weekState.subgoals && weekState.subgoals.length === 3
        ? weekState.subgoals
        : createDefaultWeekSubgoals();
    weekFlowState.currentSessionIndex = weekState.currentSessionIndex ?? 0;
    weekFlowState.sessionTimeRemaining = weekState.sessionTimeRemaining ?? 25 * 60;
    dashboardState.currentWeek = weekId;
    dashboardState.currentSession = "exploratory";

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
  weekFlowState.delayedTestAnswers = weekState.delayedTestAnswers || {};
  weekFlowState.subgoals =
    weekState.subgoals && weekState.subgoals.length === 3
      ? weekState.subgoals
      : createDefaultWeekSubgoals();

  // Week 1 skips the delayed test; later weeks skip it only if already completed
  weekFlowState.step =
    weekId === "week1" || weekState.delayedTestCompleted ? "subgoals" : "delayedTest";

  dashboardState.weeks[weekId] = {
    ...weekState,
    exploratoryStatus: "in_progress",
    exploratoryStartedAt: weekState.exploratoryStartedAt || new Date().toISOString(),
  };
  dashboardState.currentWeek = weekId;
  dashboardState.currentSession = "exploratory";

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
  weekShellEyebrow.textContent = `${weekLabel} · Exploratory Session`;
  weekShellValidation.textContent = "";

  if (weekFlowState.step === "delayedTest") {
    weekShellTitle.textContent = "Short Delayed Test";
    weekShellSubtitle.textContent = " ";
    weekShellNext.textContent = "Submit Delayed Test";
    weekShellContent.innerHTML = `
      <section class="onboarding-section">
        <p class="inline-note">
          ${escapeHtml(weekLabel)} begins with a short delayed test before sub-goal planning.
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

  // Subgoal planning step
  weekShellTitle.textContent = "Sub-goal Planning";
  weekShellSubtitle.textContent = "";
  weekShellNext.textContent = "Save Sub-goals and Continue";
  weekShellContent.innerHTML = `
    <section class="onboarding-section">
      <div class="subgoal-list">
        ${weekFlowState.subgoals
          .map(
            (goal, index) => `
              <article class="subgoal-card">
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
                    <span class="scale-value">Current value: <strong id="weekly-goal-importance-value-${index}">${escapeHtml(goal.importance)}</strong> / 7</span>
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
                    <span class="scale-value">Current value: <strong id="weekly-goal-confidence-value-${index}">${escapeHtml(goal.confidence)}</strong> / 7</span>
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
      sessions: weekState.sessions || [null, null, null],
    });
  }
  await loadDashboardState();
  showDashboardView();
});

// ── Micro-Check Overlay ───────────────────────────────────────────────────────
function showMicroCheck(sessionIndex) {
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
const TIMER_WARN_SECONDS = 25 * 60;

function startCountdown(_ignoredInitial) {
  if (countdownInterval) clearInterval(countdownInterval);
  let elapsed = 0;
  weekFlowState.sessionTimeRemaining = 0;
  const bar = document.getElementById("countdown-bar");
  const label = document.getElementById("countdown-label");

  function tick() {
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
    elapsed++;
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

function setActiveTool(nextTool) {
  if (!nextTool || nextTool === activeTool) return;

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

  logToolSwitch(previousTool, nextTool).catch((error) => {
    console.error("Tool switch log failed:", error);
  });

  enqueueQuickEvaluation({
    eventType: "tool_switch_reason",
    tool: nextTool,
    question: "Why did you switch tools?",
    responseKey: "reason",
    options: [
      { label: "Need broader sources", value: "need_broader_sources" },
      { label: "Need an explanation", value: "need_explanation" },
      { label: "Verify or compare", value: "verify_or_compare" },
      { label: "Current tool was not enough", value: "current_tool_not_enough" },
    ],
    metadata: {
      previousTool,
      nextTool,
    },
  });
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

  quickEvaluationQuestion.textContent = activeEvaluation.question;
  quickEvaluationOptions.innerHTML = "";
  activeEvaluation.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "quick-evaluation-option";
    button.type = "button";
    button.textContent = option.label;
    button.addEventListener("click", () => submitQuickEvaluation(option.value));
    quickEvaluationOptions.appendChild(button);
  });

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
    session: getActiveEvaluationSession(),
    sessionId,
    tool: evaluation.tool,
    eventType: evaluation.eventType,
    timestamp: evaluation.timestamp,
    ...(evaluation.metadata || {}),
  };
  responsePayload[evaluation.responseKey] = value;

  try {
    await saveQuickEvaluation(currentUserId, responsePayload);
  } catch (error) {
    console.error("Quick evaluation save failed:", error);
  } finally {
    showNextQuickEvaluation();
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
  return `exploratory_${weekFlowState.currentSessionIndex + 1}`;
}

async function tryLogReturnEvent() {
  if (!pendingReturnContext || !leftMainPageAt || returnLogged) return;

  const returnContext = { ...pendingReturnContext };
  const returnedAt = new Date();
  const timeAwayMs = returnedAt.getTime() - leftMainPageAt.getTime();
  if (timeAwayMs < 0) return;

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

    returnLogged = true;
    pendingReturnContext = null;
    leftMainPageAt = null;
    enqueueQuickEvaluation({
      eventType: "browser_result_returned",
      tool: "browser",
      question: "How helpful was the page you visited?",
      responseKey: "rating",
      options: createRatingOptions(),
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
            <label for="age-range">Age range</label>
            <select id="age-range">
              ${renderSelectOptions(
                ["", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
                onboardingState.demographics.ageRange,
                "Select age range"
              )}
            </select>
          </div>
          <div class="field-group">
            <label for="education-level">Education level</label>
            <select id="education-level">
              ${renderSelectOptions(
                ["", "High school", "Some college", "Bachelor's degree", "Master's degree", "Doctoral degree", "Other"],
                onboardingState.demographics.educationLevel,
                "Select education level"
              )}
            </select>
          </div>
          <div class="field-group full-width">
            <label for="primary-language">Primary language</label>
            <input id="primary-language" type="text" value="${escapeHtml(onboardingState.demographics.primaryLanguage)}" placeholder="e.g. English" />
          </div>
          <div class="field-group full-width">
            <label for="search-engine-familiarity">Familiarity with search engines</label>
            <input id="search-engine-familiarity" type="range" min="1" max="7" value="${escapeHtml(onboardingState.demographics.searchEngineFamiliarity)}" />
            <span class="scale-value">Current value: <strong id="search-engine-familiarity-value">${escapeHtml(onboardingState.demographics.searchEngineFamiliarity)}</strong> / 7</span>
          </div>
          <div class="field-group full-width">
            <label for="conversational-ai-familiarity">Familiarity with conversational AI tools (e.g., ChatGPT)</label>
            <input id="conversational-ai-familiarity" type="range" min="1" max="7" value="${escapeHtml(onboardingState.demographics.conversationalAiFamiliarity)}" />
            <span class="scale-value">Current value: <strong id="conversational-ai-familiarity-value">${escapeHtml(onboardingState.demographics.conversationalAiFamiliarity)}</strong> / 7</span>
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
    attachScaleMirror("conversational-ai-familiarity", "conversational-ai-familiarity-value");
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
                      <span class="scale-value">Current value: <strong id="goal-importance-value-${index}">${escapeHtml(goal.importance)}</strong> / 7</span>
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
                      <span class="scale-value">Current value: <strong id="goal-confidence-value-${index}">${escapeHtml(goal.confidence)}</strong> / 7</span>
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
          baseline framework data, and initial sub-goals have been stored for the next stage.
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
      ageRange: document.getElementById("age-range").value,
      primaryLanguage: document.getElementById("primary-language").value.trim(),
      educationLevel: document.getElementById("education-level").value,
      searchEngineFamiliarity: document.getElementById("search-engine-familiarity").value,
      conversationalAiFamiliarity: document.getElementById("conversational-ai-familiarity").value,
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
    const nextGoals = onboardingState.subgoals.map((_goal, index) => ({
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

// ── Week Flow Validation & Persistence ───────────────────────────────────────
function readAndValidateWeekStep() {
  if (weekFlowState.step === "delayedTest") {
    const answers = {};
    const questions = getDelayedTestQuestions(weekFlowState.weekId);

    for (const question of questions) {
      if (question.type === "shortAnswer") {
        const value = document.getElementById(question.id).value.trim();
        if (!value) return "Please answer all delayed-test questions before continuing.";
        answers[question.id] = value;
        continue;
      }

      const selected = document.querySelector(`input[name="${question.id}"]:checked`);
      if (!selected) return "Please answer all delayed-test questions before continuing.";
      answers[question.id] = selected.value;
    }

    weekFlowState.delayedTestAnswers = answers;
    return "";
  }

  const nextGoals = weekFlowState.subgoals.map((_goal, index) => ({
    question: document.getElementById(`weekly-goal-question-${index}`).value.trim(),
    type: document.getElementById(`weekly-goal-type-${index}`).value,
    importance: document.getElementById(`weekly-goal-importance-${index}`).value,
    confidence: document.getElementById(`weekly-goal-confidence-${index}`).value,
  }));

  const incompleteGoal = nextGoals.find((goal) => !goal.question || !goal.type);
  if (incompleteGoal) return "Please complete all three weekly sub-goals before continuing.";

  weekFlowState.subgoals = nextGoals;
  return "";
}

async function persistWeekFlowState() {
  const weekId = weekFlowState.weekId;
  const currentWeek = dashboardState.weeks[weekId];

  const payload = {
    ...currentWeek,
    delayedTestCompleted:
      weekId === "week1"
        ? true
        : weekFlowState.step === "delayedTest"
          ? true
          : Boolean(currentWeek.delayedTestCompleted),
    subgoalsCompleted: weekFlowState.step === "subgoals",
    delayedTestAnswers: weekId === "week1" ? {} : weekFlowState.delayedTestAnswers,
    subgoals: weekFlowState.subgoals,
  };

  dashboardState.weeks[weekId] = payload;
  await saveUserWeek(currentUserId, weekId, payload);
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
      structuredStep: "instructions",   // "instructions" | "assessment" | "completed"
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
      sessions: [null, null, null],
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

// ── Week Completion / Unlocking ───────────────────────────────────────────────

// A week is fully complete when BOTH sessions are done.
// Also checks the legacy sessionsCompleted field for backward compatibility.
function isWeekComplete(weekState) {
  const structuredDone = weekState.structuredStatus === "completed";
  const exploratoryDone =
    weekState.exploratoryStatus === "completed" || Boolean(weekState.sessionsCompleted);
  return structuredDone && exploratoryDone;
}

// Week 1 is always unlocked. Later weeks unlock when the previous week is fully complete.
function isWeekUnlocked(weekId) {
  const currentIndex = weekDefinitions.findIndex((w) => w.id === weekId);
  if (currentIndex <= 0) return true;
  const previousWeekId = weekDefinitions[currentIndex - 1].id;
  return isWeekComplete(dashboardState.weeks[previousWeekId] || {});
}

function countCompletedWeeks() {
  return weekDefinitions.filter((week) =>
    isWeekComplete(dashboardState.weeks[week.id])
  ).length;
}

// Human-readable hint for the dashboard progress caption
function getNextSessionDescription() {
  for (const week of weekDefinitions) {
    const state = dashboardState.weeks[week.id];
    if (!isWeekUnlocked(week.id)) continue;
    if (state.structuredStatus !== "completed") {
      return `${formatWeekLabel(week.id)} Structured Session`;
    }
    if ((state.exploratoryStatus || "not_started") !== "completed") {
      return `${formatWeekLabel(week.id)} Exploratory Session`;
    }
  }
  return "All sessions complete";
}

function inferCurrentWeek(weekData) {
  // Prefer a week that has an in-progress exploratory session
  const active = weekDefinitions.find(
    (week) =>
      weekData[week.id] &&
      (weekData[week.id].exploratoryStatus === "in_progress" ||
        weekData[week.id].status === "in_progress")
  );
  if (active) return active.id;

  const next = weekDefinitions.find((week) => !isWeekComplete(weekData[week.id] || {}));
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
