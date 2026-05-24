import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const DEFAULT_FILTERS = {
  statuses: [],
  assignedLoId: null,
  conditionsGt: null,
  closingFrom: null,
  closingTo: null,
  stageAgeGt: null,
  loanTypes: [],
  amountMin: null,
  amountMax: null,
};

const DEFAULT_SORT = { field: 'createdDate', dir: 'desc' };
const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 25;

function parseList(v) {
  if (!v) return [];
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseInt2(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseSort(v) {
  if (!v) return { ...DEFAULT_SORT };
  const [field, dir] = v.split(',', 2);
  return {
    field: field || DEFAULT_SORT.field,
    dir: dir === 'asc' ? 'asc' : 'desc',
  };
}

export function useFilterUrlState() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => ({
    statuses:      parseList(params.get('status')),
    assignedLoId:  parseInt2(params.get('lo')),
    conditionsGt:  parseInt2(params.get('conditionsGt')),
    closingFrom:   params.get('closingFrom') || null,
    closingTo:     params.get('closingTo') || null,
    stageAgeGt:    parseInt2(params.get('stageAgeGt')),
    loanTypes:     parseList(params.get('loanType')),
    amountMin:     parseInt2(params.get('amountMin')),
    amountMax:     parseInt2(params.get('amountMax')),
  }), [params]);

  const sort = useMemo(() => parseSort(params.get('sort')), [params]);
  const page = parseInt2(params.get('page')) ?? DEFAULT_PAGE;
  const size = parseInt2(params.get('size')) ?? DEFAULT_SIZE;

  const mutateParams = useCallback((mutator) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      mutator(next);
      return next;
    }, { replace: true });
  }, [setParams]);

  const setFilters = useCallback((patch) => {
    mutateParams((n) => {
      Object.entries(patch).forEach(([k, v]) => {
        if (k === 'statuses') {
          if (v && v.length) n.set('status', v.join(',')); else n.delete('status');
        } else if (k === 'loanTypes') {
          if (v && v.length) n.set('loanType', v.join(',')); else n.delete('loanType');
        } else if (k === 'assignedLoId') {
          if (v != null) n.set('lo', String(v)); else n.delete('lo');
        } else {
          if (v != null && v !== '') n.set(k, String(v)); else n.delete(k);
        }
      });
      n.set('page', '0');
    });
  }, [mutateParams]);

  const setSort = useCallback((field, dir) => {
    mutateParams((n) => {
      n.set('sort', `${field},${dir}`);
      n.set('page', '0');
    });
  }, [mutateParams]);

  const setPage = useCallback((p) => {
    mutateParams((n) => n.set('page', String(p)));
  }, [mutateParams]);

  const setSize = useCallback((s) => {
    mutateParams((n) => { n.set('size', String(s)); n.set('page', '0'); });
  }, [mutateParams]);

  const clearAll = useCallback(() => {
    mutateParams((n) => {
      ['status', 'lo', 'conditionsGt', 'closingFrom', 'closingTo',
       'stageAgeGt', 'loanType', 'amountMin', 'amountMax', 'sort']
        .forEach((k) => n.delete(k));
      n.set('page', '0');
    });
  }, [mutateParams]);

  const toQueryString = useCallback(() => {
    const qp = new URLSearchParams();
    if (filters.statuses.length) qp.set('status', filters.statuses.join(','));
    if (filters.assignedLoId != null) qp.set('lo', String(filters.assignedLoId));
    if (filters.conditionsGt != null) qp.set('conditionsGt', String(filters.conditionsGt));
    if (filters.closingFrom) qp.set('closingFrom', filters.closingFrom);
    if (filters.closingTo) qp.set('closingTo', filters.closingTo);
    if (filters.stageAgeGt != null) qp.set('stageAgeGt', String(filters.stageAgeGt));
    if (filters.loanTypes.length) qp.set('loanType', filters.loanTypes.join(','));
    if (filters.amountMin != null) qp.set('amountMin', String(filters.amountMin));
    if (filters.amountMax != null) qp.set('amountMax', String(filters.amountMax));
    qp.set('sort', `${sort.field},${sort.dir}`);
    qp.set('page', String(page));
    qp.set('size', String(size));
    return qp.toString();
  }, [filters, sort, page, size]);

  const isAnyFilterActive = useMemo(() => (
    filters.statuses.length > 0 ||
    filters.assignedLoId != null ||
    filters.conditionsGt != null ||
    filters.closingFrom != null ||
    filters.closingTo != null ||
    filters.stageAgeGt != null ||
    filters.loanTypes.length > 0 ||
    filters.amountMin != null ||
    filters.amountMax != null
  ), [filters]);

  return {
    filters, sort, page, size,
    setFilters, setSort, setPage, setSize, clearAll,
    toQueryString, isAnyFilterActive,
  };
}
