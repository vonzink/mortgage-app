/**
 * Ask MSFG AI — assistant service (the AssistantPort seam to the suite).
 *
 * `askAssistant` POSTs the borrower's question (plus the current step context)
 * to the msfg-suite system of record at `POST /assistant/ask` via the shared
 * `suiteClient`, and returns the assistant's answer string out of the suite's
 * standard ApiResponse envelope ({ success, message, data: { answer } }).
 *
 * GRACEFUL FALLBACK: the suite endpoint is not deployed yet. Any error (404,
 * network, malformed envelope) resolves to a friendly stub string so the drawer
 * is fully demoable NOW. We never throw to the UI — callers can render the
 * returned string unconditionally.
 */
import { suiteClient } from './apiClient';

// Shown when the suite assistant endpoint isn't reachable / not deployed yet, or
// when the suite returns success:false. Honest, on-brand, no first person about
// failures.
const FALLBACK_ANSWER =
  "I'm the MSFG AI guide — fuller answers are coming soon. In the meantime, " +
  'your loan officer can help with anything specific.';

/**
 * Ask the MSFG assistant a question.
 *
 * @param {Object}  args
 * @param {string}  args.question  the user's question text
 * @param {string} [args.step]     optional current-step context (e.g. "Employment")
 * @returns {Promise<string>}      the answer string (never rejects)
 */
export async function askAssistant({ question, step } = {}) {
  try {
    const { data } = await suiteClient.post('/assistant/ask', { question, step });

    // Suite wraps responses as { success, message, data }. Treat an explicit
    // success:false as a soft failure → fall back rather than surface an error.
    if (data && data.success === false) {
      return FALLBACK_ANSWER;
    }

    // Unwrap like the other suite calls: prefer data.data, fall back to data.
    const payload = data && data.data ? data.data : data;
    const answer = payload && typeof payload.answer === 'string' ? payload.answer.trim() : '';

    return answer || FALLBACK_ANSWER;
  } catch (err) {
    // Network / 404 / 5xx / parse — never throw to the UI.
    return FALLBACK_ANSWER;
  }
}

const assistantService = { askAssistant };
export default assistantService;
