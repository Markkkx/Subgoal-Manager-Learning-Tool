# Data Schema

## Firestore Schema

Firestore is used for user profile, onboarding, week progress, assessment answers, and a backup copy of quick evaluations.

### `users/{uid}`

Main user/profile document. Written by `saveUserOnboarding()` and `saveUserStudyProfile()`.

| Field | Type | Notes |
| --- | --- | --- |
| `onboardingStep` | string | Current onboarding step, e.g. `welcome`, `consent`, `demographics`, `quiz`, `subgoals`, `complete`. |
| `onboardingCompleted` | boolean | Whether Week 0 onboarding is complete. |
| `consentAgreed` | boolean | Consent checkbox state. |
| `demographics` | map | Basic demographics and technology familiarity fields. |
| `demographics.ageRange` | string | e.g. `18-24`. |
| `demographics.primaryLanguage` | string | User-entered language. |
| `demographics.educationLevel` | string | Selected education level. |
| `demographics.searchEngineFamiliarity` | string | 1-7 range value. |
| `demographics.conversationalAiFamiliarity` | string | 1-7 range value. |
| `demographics.technologyUsageFrequency` | string | e.g. `Daily`, `Weekly`. |
| `baselineQuizAnswers` | map | Baseline quiz answers keyed by question id. |
| `assignedCondition` | string | Study condition label. |
| `currentWeek` | string | e.g. `week1`. |
| `currentSession` | string | `structured` or `exploratory`. |
| `weekProgress` | map | Summary status for each week. |
| `updatedAt` | timestamp | Firestore server timestamp. |

### `users/{uid}/week0/subgoals`

Initial Week 0 sub-goal planning document. Written by `saveWeek0Subgoals()`.

| Field | Type | Notes |
| --- | --- | --- |
| `goal1` | map | First initial sub-goal. |
| `goal2` | map | Second initial sub-goal. |
| `goal3` | map | Third initial sub-goal. |
| `updatedAt` | timestamp | Firestore server timestamp. |

Each `goalN` map:

| Field | Type | Notes |
| --- | --- | --- |
| `question` | string | User-entered sub-goal question. |
| `type` | string | `Concept`, `Evidence`, `Comparison`, or `Application`. |
| `importance` | string | 1-7 range value. |
| `confidence` | string | 1-7 range value. |

### `users/{uid}/weeks/{weekId}`

Per-week progress document. `weekId` is normally `week1`, `week2`, `week3`, or `week4`.

| Field | Type | Notes |
| --- | --- | --- |
| `structuredStatus` | string | `not_started`, `in_progress`, or `completed`. |
| `structuredStartedAt` | string/null | ISO timestamp when structured session starts. |
| `structuredCompletedAt` | string/null | ISO timestamp when structured session completes. |
| `structuredStep` | string | e.g. `instructions` or `assessment`. |
| `structuredMaterialsChecked` | boolean | Whether assigned materials were confirmed. |
| `structuredAssessmentAnswers` | map | Structured assessment answers keyed by question id. |
| `exploratoryStatus` | string | `not_started`, `in_progress`, or `completed`. |
| `exploratoryStartedAt` | string/null | ISO timestamp when exploratory session starts. |
| `exploratoryCompletedAt` | string/null | ISO timestamp when exploratory session completes. |
| `status` | string | Legacy/general week status. |
| `delayedTestCompleted` | boolean | Whether delayed test is complete. Week 1 is treated as complete by default. |
| `subgoalsCompleted` | boolean | Whether weekly sub-goal planning is complete. |
| `delayedTestAnswers` | map | Delayed-test answers keyed by question id. Empty for Week 1. |
| `subgoals` | array | Three weekly sub-goal objects. |
| `currentSessionIndex` | number | Exploratory sub-session index, 0-2. |
| `sessionTimeRemaining` | number | Timer value in seconds. |
| `sessions` | array | Legacy micro-check/session records. |
| `sessionsCompleted` | boolean | Legacy completion flag. |
| `updatedAt` | timestamp | Firestore server timestamp. |

Each weekly `subgoals[]` item may include:

| Field | Type | Notes |
| --- | --- | --- |
| `question` | string | Weekly sub-goal question. |
| `type` | string | Goal type. |
| `importance` | string | 1-7 range value. |
| `confidence` | string | 1-7 range value. |
| `status` | string | Sidebar status such as `not_started`, `in_progress`, `completed`. |

### `users/{uid}/weeks/{weekId}/structuredAssessment/answers`

Structured assessment sub-document. Written by `saveStructuredSession()`.

| Field | Type | Notes |
| --- | --- | --- |
| `answers` | map | Assessment answers keyed by question id. |
| `submittedAt` | timestamp | Firestore server timestamp. |

### `users/{uid}/assessments/post_test`

Post-test answer document.

| Field | Type | Notes |
| --- | --- | --- |
| `answers` | map | Post-test answers keyed by question id. |
| `submittedAt` | timestamp | Firestore server timestamp. |

### `users/{uid}/quickEvaluations/{autoId}`

Backup copy of quick evaluation responses. The primary analytics copy is now also sent to Elasticsearch.

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | string | Firebase user uid. |
| `week` | string | Active week, e.g. `week1`. |
| `session` | string | Active session label, e.g. `exploratory_1`. |
| `sessionId` | string | Browser-generated app session UUID. |
| `tool` | string | `browser` or `ai_chat`. |
| `eventType` | string | Frontend evaluation trigger. |
| `rating` | number | Present for 1-5 rating events. |
| `reason` | string | Present for tool-switch reason events. |
| `timestamp` | string | Client-side ISO timestamp. |
| `queryText` | string | Optional search query context. |
| `clickedUrl` | string | Optional clicked browser result URL. |
| `clickedRank` | number | Optional clicked result rank. |
| `chatQuestion` | string | Optional user chat question. |
| `chatAnswer` | string | Optional chatbot answer. |
| `previousTool` | string | Optional previous tool for switch events. |
| `nextTool` | string | Optional next tool for switch events. |
| `returnedAt` | string | Optional ISO timestamp when user returned from external page. |
| `timeAwayMs` | number | Optional time away from search page. |
| `resultCount` | number | Optional number of search results shown. |
| `savedAt` | timestamp | Firestore server timestamp. |

### `post_test_questions/{questionId}`

Read-only question bank consumed by the app.

| Field | Type | Notes |
| --- | --- | --- |
| `order` | number | Sort order. |
| Other fields | varies | Question content/options as configured in Firestore. |

## Elasticsearch Event Schema

Elasticsearch stores behavior events in the index configured by `ELASTICSEARCH_INDEX`, currently expected to be:

```text
behavior-events
```

Every Elasticsearch document gets:

| Field | Type | Notes |
| --- | --- | --- |
| `event_type` | string | Top-level event category. |
| `timestamp` | string | Server-side UTC ISO timestamp generated by the logger. |

### `event_type: search`

Written when the user submits a Browser Search query.

| Field | Type | Notes |
| --- | --- | --- |
| `event_type` | string | `search`. |
| `timestamp` | string | Server-side UTC ISO timestamp. |
| `user_id` | string | Firebase uid or `demo-user`. |
| `session_id` | string | Browser-generated app session UUID. |
| `search_mode` | string | Currently `browser`. |
| `query_text` | string | Search query text. |

### `event_type: click`

Written when the user clicks a browser search result.

| Field | Type | Notes |
| --- | --- | --- |
| `event_type` | string | `click`. |
| `timestamp` | string | Server-side UTC ISO timestamp. |
| `user_id` | string | Firebase uid. |
| `session_id` | string | Browser-generated app session UUID. |
| `search_mode` | string | `browser`. |
| `query_text` | string | Search query at click time. |
| `clicked_url` | string | URL opened in a new tab/window. |
| `clicked_rank` | number | Result rank. |

### `event_type: return`

Written when the user returns to the app after opening an external browser result.

| Field | Type | Notes |
| --- | --- | --- |
| `event_type` | string | `return`. |
| `timestamp` | string | Server-side UTC ISO timestamp. |
| `user_id` | string | Firebase uid. |
| `session_id` | string | Browser-generated app session UUID. |
| `search_mode` | string | `browser`. |
| `query_text` | string | Search query context. |
| `clicked_url` | string | URL that was visited. |
| `clicked_rank` | number | Result rank. |
| `left_main_page_at` | string | Client-side ISO timestamp. |
| `returned_to_main_page_at` | string | Client-side ISO timestamp. |
| `time_away_ms` | number | Time away from the app in milliseconds. |

### `event_type: chat`

Written when the user sends a chat question.

| Field | Type | Notes |
| --- | --- | --- |
| `event_type` | string | `chat`. |
| `timestamp` | string | Server-side UTC ISO timestamp. |
| `user_id` | string | Firebase uid. |
| `session_id` | string | Browser-generated app session UUID. |
| `search_mode` | string | Currently `browser` in the backend payload. |
| `query_text` | string | Current browser search query context. |
| `chat_question` | string | Last user chat message. |

Note: the normal `chat` event currently logs the user question before the assistant response is generated. The assistant answer is captured in `event_type: evaluation` when the user rates a chatbot answer.

### `event_type: tool_switch`

Written when the user switches between Browser Search and AI Chat Search.

| Field | Type | Notes |
| --- | --- | --- |
| `event_type` | string | `tool_switch`. |
| `timestamp` | string | Server-side UTC ISO timestamp. |
| `user_id` | string | Firebase uid. |
| `session_id` | string | Browser-generated app session UUID. |
| `previous_tool` | string | Previous tool, e.g. `browser`. |
| `next_tool` | string | Next tool, e.g. `ai_chat`. |
| `switched_at` | string | Client-side ISO timestamp. |

### `event_type: evaluation`

Written when the user answers a quick evaluation prompt. This is the main Elasticsearch schema for ratings and switch reasons.

| Field | Type | Notes |
| --- | --- | --- |
| `event_type` | string | `evaluation`. |
| `timestamp` | string | Server-side UTC ISO timestamp. |
| `user_id` | string | Firebase uid. |
| `session_id` | string | Browser-generated app session UUID. |
| `week` | string | Active week, e.g. `week1`. |
| `session` | string | Active study session label, e.g. `exploratory_1`. |
| `tool` | string | `browser` or `ai_chat`. |
| `evaluation_event_type` | string | Specific evaluation trigger. |
| `rating` | number/null | 1-5 rating for rating prompts. |
| `reason` | string/null | Reason code for tool-switch prompts. |
| `evaluation_timestamp` | string | Client-side ISO timestamp when prompt was queued. |
| `query_text` | string | Query context if available. |
| `clicked_url` | string | Clicked browser result URL if available. |
| `clicked_rank` | number/null | Clicked browser result rank if available. |
| `chat_question` | string | Chat question if rating a chatbot answer. |
| `chat_answer` | string | Chatbot answer if rating a chatbot answer. |
| `previous_tool` | string | Previous tool for switch reason evaluations. |
| `next_tool` | string | Next tool for switch reason evaluations. |
| `returned_at` | string | Client-side return timestamp for browser-result-return evaluations. |
| `time_away_ms` | number/null | Time away from app for browser-result-return evaluations. |
| `result_count` | number/null | Search result count for browser-search-result evaluations. |

Current `evaluation_event_type` values:

| Value | Meaning | Response field |
| --- | --- | --- |
| `browser_search_results_loaded` | User rated browser search result set. | `rating` |
| `chatbot_answer_shown` | User rated AI chat answer. | `rating` |
| `browser_result_returned` | User rated an external page after returning to the app. | `rating` |
| `tool_switch_reason` | User selected why they switched tools. | `reason` |

Current `tool_switch_reason` reason values:

| Value | Label |
| --- | --- |
| `need_broader_sources` | Need broader sources |
| `need_explanation` | Need an explanation |
| `verify_or_compare` | Verify or compare |
| `current_tool_not_enough` | Current tool was not enough |

