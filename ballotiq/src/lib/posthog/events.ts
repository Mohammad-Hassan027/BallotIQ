// BallotIQ PostHog event catalog
// Format: [object]_[action], snake_case, past tense

export const EVENTS = {
  // ── Assessment flow ──────────────────────────────────────────────
  ASSESSMENT_STARTED:           'assessment_started',
  ASSESSMENT_COMPLETED:         'assessment_completed',
  ASSESSMENT_FAILED:            'assessment_failed',        // AI call failed, fallback used

  // ── Learning path ────────────────────────────────────────────────
  PATH_CHOSEN:                  'path_chosen',              // guided | chat
  LEARNING_PATH_STARTED:        'learning_path_started',
  ALL_STEPS_COMPLETED:          'all_steps_completed',

  // ── Micro-quiz (per-step comprehension check) ────────────────────
  MICRO_QUIZ_STARTED:           'micro_quiz_started',
  MICRO_QUIZ_ANSWERED:          'micro_quiz_answered',
  MICRO_QUIZ_RETRIED:           'micro_quiz_retried',

  // ── Adaptive learning ────────────────────────────────────────────
  ADAPTATION_TRIGGERED:         'adaptation_triggered',
  RE_EXPLANATION_REQUESTED:     're_explanation_requested',

  // ── Final quiz ───────────────────────────────────────────────────
  QUIZ_STARTED:                 'quiz_started',
  QUIZ_QUESTION_ANSWERED:       'quiz_question_answered',
  QUIZ_COMPLETED:               'quiz_completed',
  QUIZ_FAILED:                  'quiz_failed',
  CERTIFICATION_EARNED:         'certification_earned',

  // ── AI assistant chat ────────────────────────────────────────────
  CHAT_OPENED:                  'chat_opened',
  CHAT_MESSAGE_SENT:            'chat_message_sent',
  CHAT_RESPONSE_FAILED:         'chat_response_failed',
  CONVERSATION_CREATED:         'conversation_created',
  CONVERSATION_DELETED:         'conversation_deleted',

  // ── Language / translation ───────────────────────────────────────
  LANGUAGE_CHANGED:             'language_changed',
  TRANSLATION_FAILED:           'translation_failed',

  // ── Country selection ────────────────────────────────────────────
  COUNTRY_SELECTED:             'country_selected',

  // ── Offline mode ─────────────────────────────────────────────────
  OFFLINE_STATUS_CHANGED:       'offline_status_changed',
  OFFLINE_CONTENT_ACCESSED:     'offline_content_accessed',

  // ── Errors & fallbacks ───────────────────────────────────────────
  GEMINI_API_FAILED:            'gemini_api_failed',
  FIREBASE_ERROR:               'firebase_error',
  RATE_LIMIT_EXCEEDED:          'rate_limit_exceeded',
  FALLBACK_CONTENT_SERVED:      'fallback_content_served',
  ERROR_BOUNDARY_TRIGGERED:     'error_boundary_triggered',

  // ── UI / feature usage ───────────────────────────────────────────
  THEME_TOGGLED:                'theme_toggled',
  KEYBOARD_SHORTCUT_USED:       'keyboard_shortcut_used',
  POLLING_STATIONS_OPENED:      'polling_stations_opened',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
