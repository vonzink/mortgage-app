import React, { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import mortgageService from '../services/mortgageService';
import './FolderEvaluationCard.css';

function statusBadgeTone(status) {
  if (status === 'success') return 'ok';
  if (status === 'rate_limited' || status === 'over_budget') return 'warn';
  return 'warn';
}

function timeAgo(iso) {
  if (!iso) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function FolderEvaluationCard({ loanId, folderTemplateId, hasPrompt, aiEnabled }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await mortgageService.getFolderEvaluation(loanId, folderTemplateId);
      setLatest(result);
    } finally {
      setLoading(false);
    }
  }, [loanId, folderTemplateId]);

  useEffect(() => { if (aiEnabled && hasPrompt) load(); }, [load, aiEnabled, hasPrompt]);

  const run = async () => {
    setRunning(true);
    try {
      const result = await mortgageService.evaluateFolder(loanId, folderTemplateId);
      setLatest(result);
      setOpen(true);
      if (result.status !== 'success') {
        toast.warn(`Evaluation: ${result.status}`);
      }
    } catch (e) {
      toast.error(`Evaluation failed: ${e?.response?.data?.message || e.message}`);
    } finally {
      setRunning(false);
    }
  };

  if (!aiEnabled || !hasPrompt) return null;
  if (loading) return <div className="fec-card">Loading…</div>;

  const noEval = !latest;
  const isSuccess = latest?.status === 'success';

  return (
    <div className={`fec-card ${noEval ? 'fec-card--empty' : isSuccess ? 'fec-card--ok' : 'fec-card--warn'}`}>
      <div className="fec-head">
        <div className="fec-title">
          {noEval && <span>No evaluation yet</span>}
          {!noEval && isSuccess && (
            <span>
              Last evaluated <strong>{timeAgo(latest.createdAt)}</strong>
              {latest.costUsd != null && <> — cost ${Number(latest.costUsd).toFixed(4)}</>}
            </span>
          )}
          {!noEval && !isSuccess && (
            <span className={`fec-status fec-status--${statusBadgeTone(latest.status)}`}>
              {latest.status}
            </span>
          )}
        </div>
        <div className="fec-actions">
          {!noEval && (
            <button className="btn btn-sm" onClick={() => setOpen((o) => !o)}>
              {open ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button className="btn btn-sm btn-primary" onClick={run} disabled={running}>
            {running ? 'Evaluating…' : noEval ? 'Evaluate folder' : 'Re-evaluate'}
          </button>
        </div>
      </div>

      {!noEval && open && (
        <div className="fec-body">
          {isSuccess ? (
            <ReactMarkdown>{latest.responseMarkdown || ''}</ReactMarkdown>
          ) : (
            <p className="fec-reason">{latest.reason || 'No additional details.'}</p>
          )}
          <div className="fec-meta">
            {latest.provider && <>provider: {latest.provider}</>}
            {latest.model && <> · model: {latest.model}</>}
            {latest.actualInputTokens != null && <> · in: {latest.actualInputTokens} tok</>}
            {latest.actualOutputTokens != null && <> · out: {latest.actualOutputTokens} tok</>}
          </div>
        </div>
      )}
    </div>
  );
}
