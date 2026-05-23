package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.LoanListFilters;
import com.msfg.mortgage.dto.LoanListPage;
import com.msfg.mortgage.dto.LoanListRow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Paged, filtered, sorted backing for GET /api/loan-applications.
 *
 * <p>Queries the {@code loan_list_view} added in V24. SQL is built dynamically
 * from {@link LoanListFilters}. Sort field is whitelisted — anything not in
 * {@link #SORTABLE_COLUMNS} falls back to {@code created_date DESC}, so a
 * malicious caller can't inject via the sort param.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanApplicationListService {

    private static final Map<String, String> SORTABLE_COLUMNS = Map.of(
        "createdDate",      "created_date",
        "statusChangedAt",  "status_changed_at",
        "loanAmount",       "loan_amount"
    );
    private static final Set<String> SORT_DIRECTIONS = Set.of("asc", "desc");

    private final NamedParameterJdbcTemplate jdbc;

    public LoanListPage list(LoanListFilters filters) {
        StringBuilder where = new StringBuilder(" WHERE 1=1 ");
        MapSqlParameterSource params = new MapSqlParameterSource();

        if (!filters.statuses().isEmpty()) {
            where.append(" AND status IN (:statuses) ");
            params.addValue("statuses", filters.statuses());
        }
        filters.assignedLoId().ifPresent(id -> {
            where.append(" AND assigned_lo_id = :loId ");
            params.addValue("loId", id);
        });
        filters.conditionsGt().ifPresent(n -> {
            where.append(" AND (SELECT COUNT(*) FROM loan_conditions lc " +
                         "      WHERE lc.application_id = v.id AND lc.status = 'Outstanding') > :condGt ");
            params.addValue("condGt", n);
        });
        filters.closingFrom().ifPresent(d -> {
            where.append(" AND est_closing_date >= :closeFrom ");
            params.addValue("closeFrom", java.sql.Date.valueOf(d));
        });
        filters.closingTo().ifPresent(d -> {
            where.append(" AND est_closing_date <= :closeTo ");
            params.addValue("closeTo", java.sql.Date.valueOf(d));
        });
        filters.stageAgeGtDays().ifPresent(d -> {
            // d is a parsed Integer so safe to inline. DATEADD works in both
            // H2 and Postgres; avoids INTERVAL syntax differences.
            where.append(" AND status_changed_at < DATEADD('DAY', -" + d + ", CURRENT_TIMESTAMP) ");
        });
        if (!filters.loanTypes().isEmpty()) {
            where.append(" AND loan_type IN (:loanTypes) ");
            params.addValue("loanTypes", filters.loanTypes());
        }
        filters.amountMin().ifPresent(min -> {
            where.append(" AND loan_amount >= :amountMin ");
            params.addValue("amountMin", min);
        });
        filters.amountMax().ifPresent(max -> {
            where.append(" AND loan_amount <= :amountMax ");
            params.addValue("amountMax", max);
        });

        String sortCol = SORTABLE_COLUMNS.getOrDefault(filters.sortField(), "created_date");
        String sortDir = SORT_DIRECTIONS.contains(filters.sortDirection().toLowerCase())
            ? filters.sortDirection().toLowerCase() : "desc";

        int page = Math.max(0, filters.page());
        int size = Math.max(1, Math.min(filters.size(), 200));
        int offset = page * size;

        String selectSql = """
            SELECT v.id, v.application_number, v.status, v.borrower_name,
                   v.property_city, v.property_state,
                   (SELECT COUNT(*) FROM loan_conditions lc
                     WHERE lc.application_id = v.id AND lc.status = 'Outstanding') AS outstanding_conditions,
                   v.loan_amount, v.property_value,
                   CASE WHEN v.property_value IS NOT NULL AND v.property_value > 0
                        THEN (v.loan_amount / v.property_value) * 100.0
                        ELSE NULL
                   END AS ltv_pct,
                   v.est_closing_date,
                   v.assigned_lo_name,
                   v.status_changed_at,
                   v.created_date
              FROM loan_list_view v
            """ + where + " ORDER BY " + sortCol + " " + sortDir + ", v.id DESC " +
            " LIMIT :limit OFFSET :offset ";
        params.addValue("limit", size);
        params.addValue("offset", offset);

        String countSql = "SELECT COUNT(*) FROM loan_list_view v " + where;

        List<LoanListRow> content = jdbc.query(selectSql, params, (rs, i) -> new LoanListRow(
            rs.getLong("id"),
            rs.getString("application_number"),
            rs.getString("status"),
            rs.getString("borrower_name"),
            rs.getString("property_city"),
            rs.getString("property_state"),
            rs.getObject("outstanding_conditions") != null
                ? ((Number) rs.getObject("outstanding_conditions")).intValue() : null,
            (BigDecimal) rs.getObject("loan_amount"),
            (BigDecimal) rs.getObject("property_value"),
            rs.getObject("ltv_pct") != null
                ? ((Number) rs.getObject("ltv_pct")).doubleValue() : null,
            rs.getDate("est_closing_date") != null ? rs.getDate("est_closing_date").toLocalDate() : null,
            rs.getString("assigned_lo_name"),
            rs.getTimestamp("status_changed_at") != null ? rs.getTimestamp("status_changed_at").toLocalDateTime() : null,
            rs.getTimestamp("created_date") != null ? rs.getTimestamp("created_date").toLocalDateTime() : null
        ));

        Long total = jdbc.queryForObject(countSql, params, Long.class);
        long totalElements = total != null ? total : 0L;
        int totalPages = (int) Math.ceil((double) totalElements / size);

        return new LoanListPage(content, totalElements, totalPages, page, size);
    }
}
