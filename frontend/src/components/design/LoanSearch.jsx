import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Pill from './Pill';
import mortgageService from '../../services/mortgageService';
import { getRecentLoans, pushRecentLoan } from '../../utils/recentLoans';
import './LoanSearch.css';

const DEBOUNCE_MS = 200;
const MIN_QUERY_LEN = 2;
const MAX_RECENT_SHOWN = 5;

function statusTone(status) {
  if (!status) return 'muted';
  if (status === 'FUNDED' || status === 'CTC' || status === 'DOCS_OUT') return 'active';
  if (status === 'DISPOSITIONED') return 'danger';
  if (status === 'REGISTERED' || status === 'APPLICATION') return 'muted';
  return 'review';
}

function Highlighted({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function LoanSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [hasQueried, setHasQueried] = useState(false);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const recents = useMemo(() => getRecentLoans().slice(0, MAX_RECENT_SHOWN), [open]);

  const items = query.trim().length >= MIN_QUERY_LEN ? hits : recents;

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setHits([]);
      setHasQueried(false);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const results = await mortgageService.searchLoans(q, { signal: ctrl.signal, limit: 10 });
        if (!ctrl.signal.aborted) {
          setHits(results);
          setHasQueried(true);
          setHighlight(0);
        }
      } catch (e) {
        if (e?.name !== 'CanceledError' && e?.code !== 'ERR_CANCELED') {
          if (!ctrl.signal.aborted) {
            setHits([]);
            setHasQueried(true);
          }
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = useCallback((hit) => {
    if (!hit) return;
    pushRecentLoan({
      id: hit.id,
      applicationNumber: hit.applicationNumber,
      borrowerName: hit.borrowerName,
    });
    setOpen(false);
    setQuery('');
    navigate(`/loan/${hit.id}`);
  }, [navigate]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const trimmed = query.trim();
  const showNoMatches = trimmed.length >= MIN_QUERY_LEN && hasQueried && !loading && hits.length === 0;

  return (
    <div className="loan-search" ref={containerRef} role="combobox"
         aria-expanded={open} aria-haspopup="listbox" aria-owns="loan-search-results">
      <span className="loan-search-icon"><Icon name="search" size={14} /></span>
      <input
        ref={inputRef}
        type="search"
        className="loan-search-input"
        placeholder="Find a loan… (⌘K)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-controls="loan-search-results"
        aria-activedescendant={open && items[highlight] ? `loan-search-opt-${items[highlight].id}` : undefined}
      />
      {open && (
        <div className="loan-search-panel" id="loan-search-results" role="listbox">
          {trimmed.length < MIN_QUERY_LEN && recents.length > 0 && (
            <div className="loan-search-section">Recently opened</div>
          )}
          {items.map((item, i) => {
            const isResult = trimmed.length >= MIN_QUERY_LEN;
            return (
              <button
                type="button"
                key={item.id}
                id={`loan-search-opt-${item.id}`}
                role="option"
                aria-selected={i === highlight}
                className={`loan-search-row${i === highlight ? ' is-highlighted' : ''}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(item)}
              >
                <div className="loan-search-row-main">
                  <div className="loan-search-row-name">
                    <Highlighted text={item.borrowerName || '—'} query={trimmed} />
                  </div>
                  <div className="loan-search-row-sub">
                    {[
                      [item.city, item.state].filter(Boolean).join(', '),
                      item.applicationNumber ? `#${item.applicationNumber}` : null,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                {isResult && item.status && (
                  <Pill tone={statusTone(item.status)} dot>{item.status}</Pill>
                )}
              </button>
            );
          })}
          {trimmed.length < MIN_QUERY_LEN && recents.length === 0 && (
            <div className="loan-search-empty">Type a borrower name, app #, or loan #</div>
          )}
          {showNoMatches && (
            <div className="loan-search-empty">
              No loans match "{trimmed}" —{' '}
              <Link to={`/applications?q=${encodeURIComponent(trimmed)}`} className="loan-search-link">
                Browse all loans →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
