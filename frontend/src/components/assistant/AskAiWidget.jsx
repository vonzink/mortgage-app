/**
 * Ask MSFG AI — floating trigger pill + right-side slide-in drawer.
 *
 * Self-contained overlay rendered once at the apply-flow level so it appears on
 * every step. It lives OUTSIDE the form (it's a separate overlay), so it never
 * touches react-hook-form state or form submission.
 *
 * - Trigger pill (always visible, bottom-right) opens the drawer.
 * - Drawer slides in from the right; the page behind dims; Esc / ✕ / overlay
 *   click closes it. Local chat state lives here (messages array).
 * - On submit: push the user message, call `askAssistant` (the suite seam), show
 *   a typing indicator, then push the assistant reply. The service never throws
 *   — a friendly stub answers when the suite isn't reachable yet.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaHome, FaTimes, FaMicrophone, FaArrowUp } from 'react-icons/fa';
import { askAssistant } from '../../services/assistantService';
import './AskAiWidget.css';

const SUGGESTIONS = [
  'How much home can I afford?',
  'What credit score do I need to buy?',
  'How much down payment do I need?',
  "FHA vs. conventional — what's the difference?",
  'Help me with this step',
];

// The label used in suggestion #5 — when tapped we send a contextual question
// that names the current step so the assistant can help with where the user is.
const HELP_WITH_STEP = 'Help me with this step';

const GREETING =
  'Hi! Ask MSFG AI anything about your application or mortgages — your answers stay private.';

const DISCLAIMER =
  'MSFG AI can make mistakes and may be recorded for quality & compliance. Not a commitment to lend.';

let msgSeq = 0;
const nextId = () => `m${++msgSeq}`;

const AskAiWidget = ({ currentStep }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { id, role: 'user'|'assistant', text }
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false); // awaiting an assistant reply

  const inputRef = useRef(null);
  const bodyRef = useRef(null);
  const triggerRef = useRef(null);

  // `currentStep` may be a label ("Employment") or a number; normalize to a
  // human string for the "Help me with this step" context.
  const stepLabel =
    currentStep === null || currentStep === undefined || currentStep === ''
      ? ''
      : typeof currentStep === 'number'
      ? `Step ${currentStep}`
      : String(currentStep);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    // Return focus to the trigger for keyboard users.
    if (triggerRef.current) triggerRef.current.focus();
  }, []);

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeDrawer]);

  // Autofocus the input when the drawer opens.
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Keep the message area scrolled to the newest content.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, pending]);

  // Send a question through the assistant seam. `text` is the user-visible
  // message; `outbound` (defaults to text) is what we actually ask the suite —
  // this lets the step suggestion carry extra context while showing a clean
  // bubble.
  const send = useCallback(
    async (text, outbound) => {
      const trimmed = (text || '').trim();
      if (!trimmed || pending) return;

      setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: trimmed }]);
      setDraft('');
      setPending(true);

      const answer = await askAssistant({
        question: (outbound || trimmed).trim(),
        step: stepLabel || undefined,
      });

      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text: answer }]);
      setPending(false);
    },
    [pending, stepLabel]
  );

  const onSuggestion = (label) => {
    if (label === HELP_WITH_STEP) {
      // Show the friendly label, but ask a question that names the current step.
      const ctx = stepLabel ? ` I'm on the "${stepLabel}" step.` : '';
      send(label, `Help me with this step of my mortgage application.${ctx}`);
    } else {
      send(label);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send(draft);
  };

  const showIntro = messages.length === 0;

  return (
    <div className="askai">
      {/* Trigger pill — always visible on every apply step */}
      <button
        type="button"
        ref={triggerRef}
        className="askai-trigger"
        aria-label="Ask MSFG AI"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="askai-trigger-icon" aria-hidden="true">
          <FaHome />
        </span>
        <span className="askai-trigger-label">Ask AI</span>
      </button>

      {open && (
        <>
          {/* Dimming overlay — click to close */}
          <div className="askai-overlay" onClick={closeDrawer} aria-hidden="true" />

          {/* Drawer */}
          <aside
            className="askai-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Ask MSFG AI"
          >
            <header className="askai-header">
              <img className="askai-logo" src="/brand/msfg-logo.png" alt="MSFG" />
              <h2 className="askai-title">Ask MSFG AI</h2>
              <button
                type="button"
                className="askai-close"
                aria-label="Close"
                onClick={closeDrawer}
              >
                <FaTimes />
              </button>
            </header>

            <div className="askai-body" ref={bodyRef}>
              {showIntro && (
                <>
                  <p className="askai-greeting">{GREETING}</p>
                  <div className="askai-suggestions">
                    {SUGGESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="askai-suggestion"
                        onClick={() => onSuggestion(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {messages.map((m) => (
                <div key={m.id} className={`askai-msg ${m.role}`}>
                  <div className="askai-bubble">{m.text}</div>
                </div>
              ))}

              {pending && (
                <div className="askai-msg assistant">
                  <div className="askai-bubble askai-typing" aria-label="MSFG AI is typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>

            <div className="askai-inputbar">
              <form className="askai-inputrow" onSubmit={onSubmit}>
                <input
                  ref={inputRef}
                  className="askai-input"
                  type="text"
                  placeholder="Continue this thread…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label="Ask a question"
                />
                {/* TODO: wire voice input (speech-to-text). Decorative no-op for now. */}
                <button
                  type="button"
                  className="askai-iconbtn"
                  aria-label="Voice input (coming soon)"
                  tabIndex={-1}
                >
                  <FaMicrophone />
                </button>
                <button
                  type="submit"
                  className="askai-send"
                  aria-label="Send"
                  disabled={!draft.trim() || pending}
                >
                  <FaArrowUp />
                </button>
              </form>
              <p className="askai-disclaimer">{DISCLAIMER}</p>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AskAiWidget;
