import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import mortgageService from '../../services/mortgageService';
import { groupLoans } from './loanGroups';
import planColumns from './planColumns';
import LoanSelector, { humanizeStatus } from './sections/LoanSelector';
import StatusRail from './sections/StatusRail';
import TodoList from './sections/TodoList';
import UploadDropzone from './sections/UploadDropzone';
import ClearedItems from './sections/ClearedItems';
import DownloadsCard from './sections/DownloadsCard';
import RateLockCard from './sections/RateLockCard';
import KeyDatesCard from './sections/KeyDatesCard';
import CalendarModal from './sections/CalendarModal';
import AppraisalCard from './sections/AppraisalCard';
import SnapshotCard from './sections/SnapshotCard';
import PaymentCard from './sections/PaymentCard';
import LoanOfficerCard from './sections/LoanOfficerCard';
import NotificationsCard from './sections/NotificationsCard';
import ContactCards from './sections/ContactCards';
import ClosingCostsCard from './sections/ClosingCostsCard';
import './LoanStatusCenter.css';

/**
 * Loan Status Center — the borrower's /dashboard. Container shell: fetches the
 * borrower's loan list (suite /me/loans via getApplications) for the selector,
 * resolves the selected loan (?loan= param → first active → first overall), and
 * fetches the borrower dashboard payload for it. Section components render into
 * the empty grid columns (Tasks 14–17); a null/absent payload section means the
 * LO hid it, so sections render nothing for it.
 */
export default function LoanStatusCenter({ loanId = null } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loans, setLoans] = useState(null);   // null = list not loaded yet
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0); // thumbnail-strip selection (v2.1)
  const dropzoneRef = useRef(null);

  // Re-run the dashboard fetch for the selected loan (used after an upload or a
  // notifications save so the view reflects the new server state).
  const refetch = useCallback(() => setRetryTick((t) => t + 1), []);

  // Generic v1 for a to-do "Upload" click: focus/scroll the shared dropzone.
  // (Per-condition upload matching is an explicit follow-up.)
  const focusDropzone = useCallback(() => {
    const el = dropzoneRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const fetchLoans = useCallback(async () => {
    try {
      // Suite /me/loans (borrower-scoped server-side), adapted rows:
      // { id, status, statusChangedAt (suite updatedAt), applicationNumber (suite
      // loanNumber), city, state } → selector shape below.
      const page = await mortgageService.getApplications();
      const rows = page?.content ?? [];
      setLoans(rows.map((r) => ({
        id: r.id,
        status: r.status,
        statusChangedAt: r.statusChangedAt,
        loanNumber: r.applicationNumber,
        label: [r.city, r.state].filter(Boolean).join(', ') || null,
      })));
    } catch {
      setLoans(null);
      setError("Couldn't load your loans.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loanId) return;      // explicit client-view mode: no /me/loans for a staff previewer
    fetchLoans();
  }, [fetchLoans, loanId]);

  // Selection: an explicit loanId (staff client-view) wins; else ?loan= when it's one of
  // the borrower's loans, else the most recently active loan, else the first loan overall.
  const paramId = searchParams.get('loan');
  const selectedId = useMemo(() => {
    if (loanId) return loanId;            // explicit client-view mode
    if (!loans || loans.length === 0) return null;
    if (paramId && loans.some((l) => String(l.id) === String(paramId))) return paramId;
    const { active } = groupLoans(loans);
    return active[0]?.id ?? loans[0]?.id ?? null;
  }, [loans, paramId, loanId]);

  // Reset the hero to the first photo ONLY when the selected loan changes — not
  // on a background refetch (retryTick bumps from NotificationsCard onSaved /
  // UploadDropzone onUploaded), which would yank a borrower off the thumbnail
  // they picked. A same-loan refetch that shrinks the photo list is handled by
  // the heroEffectiveIdx clamp below, so a preserved index stays valid.
  useEffect(() => {
    setHeroIdx(0);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let stale = false;
    setLoading(true);
    (async () => {
      // getBorrowerDashboard swallows failures and resolves null.
      const data = await mortgageService.getBorrowerDashboard(selectedId);
      if (stale) return;
      if (data) {
        setPayload(data);
        setError(null);
      } else {
        setError("Couldn't load your loan right now.");
      }
      setLoading(false);
    })();
    return () => { stale = true; };
  }, [selectedId, retryTick]);

  const handleSelect = useCallback((id) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('loan', String(id));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleRetry = useCallback(() => {
    setError(null);
    if (!loans) {
      setLoading(true);
      fetchLoans();
    } else {
      setRetryTick((t) => t + 1);
    }
  }, [loans, fetchLoans]);

  const selectedLoan = loans?.find((l) => String(l.id) === String(selectedId)) || null;
  const prop = payload?.property || null;
  // v2.1 multi-photo: property.photoUrls (ordered presigned GETs, never
  // containing nulls — the server skips failed presigns) drives the hero and
  // the thumbnail strip; property.photoUrl (= first element; the only field on
  // pre-v2.1 payloads) remains the legacy fallback. heroIdx is clamped so a
  // stale index (payload refetch shrank the list) falls back to the first photo.
  const photoList = Array.isArray(prop?.photoUrls) && prop.photoUrls.length > 0
    ? prop.photoUrls
    : (prop?.photoUrl ? [prop.photoUrl] : []);
  const heroEffectiveIdx = photoList[heroIdx] != null ? heroIdx : 0;
  const photoUrl = photoList[heroEffectiveIdx] ?? null;
  const addressLine = prop
    ? [prop.addressLine1, [prop.city, prop.state].filter(Boolean).join(', ')]
        .filter(Boolean).join(' · ') || null
    : null;

  // v2.1 layout contract: one renderer for all 14 section keys, gated exactly
  // like the old inline blocks — a null/absent payload field means the LO hid
  // the section, so its key renders nothing no matter which column the layout
  // puts it in.
  const renderSection = (key) => {
    switch (key) {
      case 'milestones':
        return payload?.milestones != null
          ? <StatusRail key="milestones" milestones={payload.milestones} />
          : null;
      case 'loanOfficer':
        return payload?.loanOfficer != null
          ? <LoanOfficerCard key="loanOfficer" loanOfficer={payload.loanOfficer} />
          : null;
      case 'contacts':
        return payload?.contacts != null
          ? <ContactCards key="contacts" contacts={payload.contacts} />
          : null;
      case 'notifications':
        return payload?.notificationPrefs != null
          ? (
            <NotificationsCard
              key="notifications"
              prefs={payload.notificationPrefs}
              suiteLoanId={selectedId}
              onSaved={refetch}
            />
          )
          : null;
      case 'todo':
        return payload?.conditions != null
          ? (
            <TodoList
              key="todo"
              conditions={payload.conditions}
              onUploadForCondition={focusDropzone}
            />
          )
          : null;
      case 'dropzone':
        return payload?.documents?.uploads != null
          ? (
            <div key="dropzone" ref={dropzoneRef}>
              <UploadDropzone suiteLoanId={selectedId} onUploaded={refetch} />
            </div>
          )
          : null;
      case 'cleared':
        return payload?.conditions != null
          ? <ClearedItems key="cleared" conditions={payload.conditions} />
          : null;
      case 'downloads':
        return payload?.documents?.fromTeam != null
          ? (
            <DownloadsCard
              key="downloads"
              fromTeam={payload.documents.fromTeam}
              suiteLoanId={selectedId}
            />
          )
          : null;
      case 'rateLock':
        return payload?.rateLock != null
          ? <RateLockCard key="rateLock" rateLock={payload.rateLock} />
          : null;
      case 'keyDates':
        return payload?.keyDates != null
          ? (
            <KeyDatesCard
              key="keyDates"
              keyDates={payload.keyDates}
              onOpenCalendar={() => setCalendarOpen(true)}
            />
          )
          : null;
      case 'appraisal':
        return payload?.visibility?.showAppraisal
          ? (
            <AppraisalCard
              key="appraisal"
              keyDates={payload.keyDates || []}
              purchasePrice={payload.loanSnapshot?.purchasePrice}
            />
          )
          : null;
      case 'snapshot':
        return payload?.loanSnapshot != null
          ? <SnapshotCard key="snapshot" loanSnapshot={payload.loanSnapshot} />
          : null;
      case 'payment':
        return payload?.payment != null
          ? <PaymentCard key="payment" payment={payload.payment} />
          : null;
      case 'closingCosts':
        return payload?.closingCosts != null
          ? <ClosingCostsCard key="closingCosts" closingCosts={payload.closingCosts} />
          : null;
      default:
        return null;
    }
  };

  // Column plan: layout-claimed keys render in the column that claims them
  // (cross-column drags honored); unclaimed keys append to their home column
  // in default order. Absent/malformed layout → the default arrangement.
  const columnPlan = planColumns(payload?.layout);

  return (
    <div className="lsc-page">
      {error && (
        <div className="lsc-error-banner" role="alert">
          <span className="lsc-error-msg">{error}</span>
          <button type="button" className="lsc-error-retry" onClick={handleRetry}>
            Retry
          </button>
          <button
            type="button"
            className="lsc-error-dismiss"
            aria-label="Dismiss"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      <header className={`lsc-hero${photoUrl ? ' lsc-hero--photo' : ''}`}>
        {/* must stay first child — hero text paints above it by DOM order */}
        {photoUrl && (
          <div
            className="lsc-hero-photo"
            style={{ backgroundImage: `url("${photoUrl}")` }}
            aria-hidden="true"
          />
        )}
        <div className="lsc-hero-text">
          {selectedLoan?.loanNumber && (
            <div className="lsc-eyebrow">Loan #{selectedLoan.loanNumber}</div>
          )}
          <h1>Loan status center</h1>
          {addressLine && <p className="lsc-sub">{addressLine}</p>}
          {prop?.vesting?.trim() && (
            <p className="lsc-sub lsc-vesting">{prop.vesting.trim()}</p>
          )}
        </div>
        {payload?.status && (
          <span className="lsc-status-pill">{humanizeStatus(payload.status)}</span>
        )}
      </header>

      {photoList.length > 1 && (
        <div className="lsc-photo-strip" role="group" aria-label="Property photos">
          {photoList.map((url, i) => (
            <button
              key={`photo-${i}`}
              type="button"
              className={`lsc-photo-thumb${i === heroEffectiveIdx ? ' is-active' : ''}`}
              style={{ backgroundImage: `url("${url}")` }}
              aria-label={`Show photo ${i + 1} of ${photoList.length}`}
              aria-pressed={i === heroEffectiveIdx}
              onClick={() => setHeroIdx(i)}
            />
          ))}
        </div>
      )}

      {!loanId && loans && loans.length > 1 && (
        <LoanSelector loans={loans} selectedId={selectedId} onSelect={handleSelect} />
      )}

      {loading ? (
        <div className="lsc-skeleton" role="status" aria-label="Loading your loan" />
      ) : (
        <div className="lsc-grid">
          {/*
            Each section renders ONLY when its gating payload field is non-null;
            a null/absent field means the LO hid that section (server-visibility
            contract). visibility{} is always present and gates the appraisal
            card, which has no own payload field.

            v2.1: section ARRANGEMENT (column + order) comes from payload.layout
            (the LO's saved drag-to-arrange; union contract — any key in any
            column) via planColumns — absent layout falls back to the default
            arrangement, unknown keys are ignored, cross-array duplicates
            resolve global-first-occurrence-wins, unclaimed keys append to
            their home column in default order. Hiding beats ordering.
          */}
          <aside className="lsc-rail-col">
            {columnPlan.rail.map(renderSection)}
          </aside>

          <main className="lsc-main-col">
            {columnPlan.main.map(renderSection)}
          </main>

          <aside className="lsc-side-col">
            {columnPlan.side.map(renderSection)}
          </aside>
        </div>
      )}

      {calendarOpen && payload?.keyDates != null && (
        <CalendarModal
          keyDates={payload.keyDates}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </div>
  );
}
