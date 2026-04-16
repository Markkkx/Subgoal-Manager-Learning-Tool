import {
  isFirebaseReady,
  loginWithEmail,
  logoutUser,
  onAuthReady,
  signUpWithEmail,
} from "./firebase-auth.js";

const authShell = document.getElementById("auth-shell");
const appShell = document.getElementById("app-shell");
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

sessionIdDisplay.textContent = sessionId;
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
  summaryText.textContent = "Generating a search summary...";

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

onAuthReady((user) => {
  if (!user) {
    showAuthView();
    return;
  }

  handleAuthenticatedUser(user);
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
  authShell.classList.remove("hidden");
  appShell.classList.add("hidden");
  authPassword.value = "";
}

function showAppView() {
  authShell.classList.add("hidden");
  appShell.classList.remove("hidden");
}

function handleAuthenticatedUser(user) {
  currentUserId = user.uid;
  userIdDisplay.textContent = currentUserId;
  authUserDisplay.textContent = user.email || user.uid;
  authError.textContent = "";
  showAppView();
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
  if (!summary) {
    summaryText.textContent =
      "No Groq summary is available yet. Add GROQ_API_KEY to enable automatic summaries.";
    return;
  }

  summaryText.textContent = summary;
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
