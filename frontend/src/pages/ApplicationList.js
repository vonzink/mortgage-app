import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import mortgageService from '../services/mortgageService';
import Icon from '../components/design/Icon';
import Button from '../components/design/Button';
import Card from '../components/design/Card';

import PipelineTable from './loanList/PipelineTable';
import FilterChips from './loanList/FilterChips';
import Pager from './loanList/Pager';
import { useFilterUrlState } from './loanList/useFilterUrlState';

import { formatMoneyShort } from '../utils/format';
import './ApplicationList.design.css';

/**
 * Pipeline — the admin/LO landing surface for loans in flight. Driven by URL
 * params so any view is a bookmark. Replaces the legacy in-memory card list.
 * Backed by GET /api/loan-applications (paged) and the global TopBar typeahead.
 */
export default function ApplicationList() {
  const navigate = useNavigate();
  const {
    filters, sort, page, size,
    setFilters, setSort, setPage, setSize, clearAll,
    toQueryString,
  } = useFilterUrlState();

  const [data, setData] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await mortgageService.getApplications(toQueryString());
      setData(result);
    } catch (err) {
      toast.error('Failed to load applications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toQueryString]);

  useEffect(() => { fetch(); }, [fetch]);

  // Lightweight stat cards over the current page only. (At 1K–5K loans these
  // are good-enough approximations — full-pipeline rollups would need a
  // separate endpoint and aren't worth it for v1.)
  const totalPipeline = data.content.reduce((s, r) => s + (Number(r.loanAmount) || 0), 0);
  const needsAction = data.content.filter((r) => (r.outstandingConditions || 0) > 0).length;
  const kpis = [
    { label: 'Loans on page',       value: data.content.length,                 sub: `of ${data.totalElements} total` },
    { label: 'Total amount (page)', value: formatMoneyShort(totalPipeline),     sub: '' },
    { label: 'Needs action (page)', value: needsAction,                          sub: 'outstanding conditions > 0' },
  ];

  return (
    <div className="page apps-page">
      <div className="apps-page-header">
        <h1 className="apps-page-title">Pipeline</h1>
        <Button variant="primary" onClick={() => navigate('/apply')}>
          <Icon name="plus" size={14} /> New application
        </Button>
      </div>

      <div className="apps-kpis">
        {kpis.map((k) => (
          <Card key={k.label} pad>
            <div className="apps-kpi-label">{k.label}</div>
            <div className="apps-kpi-value">{k.value}</div>
            {k.sub && <div className="apps-kpi-sub">{k.sub}</div>}
          </Card>
        ))}
      </div>

      <FilterChips
        filters={filters}
        resultCount={data.totalElements}
        onChange={setFilters}
        onClear={clearAll}
      />

      {loading ? (
        <Card pad><div className="muted">Loading loans…</div></Card>
      ) : (
        <>
          <PipelineTable
            rows={data.content}
            sort={sort}
            onSort={setSort}
          />
          <Pager
            page={page} size={size}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPage={setPage}
            onSize={setSize}
          />
        </>
      )}
    </div>
  );
}
