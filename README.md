# Subgoal-Manager-Learning-Tool

Minimal local demo web app for a research prototype that:

- gates access with Firebase Authentication
- shows a familiar browser-style search experience inside a learning site
- uses SerpAPI for web search results
- uses Groq for chatbot responses and query summaries
- logs search and click behavior through a modular tracking layer

## Project structure

```text
.
├── app
│   ├── __init__.py
│   ├── config.py
│   ├── logging_store
│   │   ├── base.py
│   │   ├── elasticsearch_stub.py
│   │   └── local_json.py
│   ├── services
│   │   ├── chat_service.py
│   │   └── search_service.py
│   ├── static
│   │   ├── app.js
│   │   ├── firebase-auth.js
│   │   ├── firebase-config.js
│   │   └── style.css
│   └── templates
│       └── index.html
├── data
├── .env.example
├── requirements.txt
└── run.py
```

## How it works

1. The frontend sends the user's query to `POST /api/search`.
2. The Flask backend logs the search event.
3. The backend calls SerpAPI and returns normalized search results.
4. If Groq is configured, the backend also generates a short summary of the search topic.
5. The frontend renders the results and summary on the same page.
6. When a user clicks a result, the frontend first calls `POST /api/click`.
7. After the click is logged, the result opens in a new browser tab.
8. A chatbot panel can send follow-up questions to `POST /api/chat`.

## Authentication flow

- unauthenticated users see a combined login / sign-up page
- Firebase Authentication handles email/password sign-up and login
- authenticated users are shown the existing research interface
- logging out returns the user to the auth page

## Behavior logging

This prototype does not use Elasticsearch for search results.
SerpAPI provides the web search results.

The logging layer is intentionally modular:

- `BaseEventLogger` defines the interface
- `LocalJsonEventLogger` stores events in `data/events.json`
- `ElasticsearchEventLogger` can write the same events into Elasticsearch

## Run locally

### 1. Create a virtual environment

```bash
python3.10 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env` and add your real `SERPAPI_KEY`.
Add `GROQ_API_KEY` too if you want the chatbot and automatic summaries enabled.
Add your Firebase web app config values to enable authentication.

If you want to test Elasticsearch logging, also change:

```env
LOG_BACKEND=elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=behavior-events
```

### 4. Start the app

```bash
python run.py
```

### 5. Open the demo

Visit:

```text
http://127.0.0.1:5000
```

## Firebase setup

1. Create a Firebase project.
2. In Firebase Authentication, enable the Email/Password sign-in method.
3. In Project Settings, create a Web App and copy the Firebase config values.
4. Paste those values into `.env`.

The auth gate is implemented on the frontend so the existing research page can stay largely unchanged.

## Logged fields

Search events include:

- `user_id`
- `session_id`
- `search_mode`
- `query_text`
- `timestamp`

Click events include:

- `user_id`
- `session_id`
- `search_mode`
- `query_text`
- `clicked_url`
- `clicked_rank`
- `timestamp`

Return events include:

- `user_id`
- `session_id`
- `search_mode`
- `query_text`
- `clicked_url`
- `clicked_rank`
- `left_main_page_at`
- `returned_to_main_page_at`
- `time_away_ms`
- `timestamp`

Chat events include:

- `user_id`
- `session_id`
- `search_mode`
- `query_text`
- `chat_question`
- `timestamp`

## Groq features

If `GROQ_API_KEY` is set:

- the chatbot panel can answer follow-up questions
- each search can produce a short summary grounded in the returned search results
- the chatbot panel also shows a few extracted keywords from the latest search-bar query

If `GROQ_API_KEY` is missing:

- search still works
- the chatbot and summary features stay disabled with a friendly message

## Return-to-Main Tracking

The frontend also records a proxy for how long a user stays away from the main page after clicking a result:

1. when a result is clicked, the app stores the clicked URL and rank
2. when the page becomes hidden, it records when the user left the main interface
3. when the page becomes visible again, it logs a `return` event

This is useful for research, but it is only a proxy for reading time on the external page.

## Notes for future Elasticsearch integration

This app already supports both logging backends:

1. `LOG_BACKEND=json` writes to `data/events.json`
2. `LOG_BACKEND=elasticsearch` writes the same events to Elasticsearch

If Elasticsearch is enabled, the app expects a local or remote ES node to be running.

This repo is intended to run on Python 3.10+.
