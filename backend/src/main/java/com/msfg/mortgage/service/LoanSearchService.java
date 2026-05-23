package com.msfg.mortgage.service;

import com.msfg.mortgage.dto.LoanSearchHit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Typeahead for the global TopBar search. Backed by {@code loan_list_view}
 * (V24).
 *
 * <p>Ranking:
 * <ol>
 *   <li>Exact match on any identifier (application_number,
 *       lendingpad_loan_number, mers_min, investor_loan_number) → rank 1</li>
 *   <li>Prefix match on the same identifiers → rank 2</li>
 *   <li>Substring match on borrower name → rank 3</li>
 * </ol>
 *
 * <p>{@code ILIKE %q%} on borrower name works in both H2 and Postgres. On
 * Postgres, the V24 trigram GIN (when applied via the one-shot SQL noted in
 * V24's header comment) lets the planner serve the same query from an index.
 * In H2 we fall back to a full scan — acceptable since dev DBs are tiny.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoanSearchService {

    private static final int MIN_QUERY_LEN = 2;
    private static final int DEFAULT_LIMIT = 10;

    private final NamedParameterJdbcTemplate jdbc;

    public List<LoanSearchHit> search(String rawQuery, Integer limit) {
        if (rawQuery == null) return List.of();
        String q = rawQuery.trim();
        if (q.length() < MIN_QUERY_LEN) return List.of();

        int cap = (limit == null || limit < 1 || limit > 50) ? DEFAULT_LIMIT : limit;

        MapSqlParameterSource p = new MapSqlParameterSource();
        p.addValue("q",        q);
        p.addValue("qPrefix",  q + "%");
        p.addValue("qSubstr",  "%" + q + "%");
        p.addValue("limit",    cap);

        String sql = """
            SELECT id, application_number, borrower_name,
                   property_city, property_state, status, rank
              FROM (
                SELECT id, application_number, borrower_name,
                       property_city, property_state, status,
                       CASE
                         WHEN UPPER(application_number)      = UPPER(:q)
                           OR UPPER(lendingpad_loan_number)  = UPPER(:q)
                           OR UPPER(mers_min)                = UPPER(:q)
                           OR UPPER(investor_loan_number)    = UPPER(:q) THEN 1
                         WHEN UPPER(application_number)      LIKE UPPER(:qPrefix)
                           OR UPPER(lendingpad_loan_number)  LIKE UPPER(:qPrefix)
                           OR UPPER(mers_min)                LIKE UPPER(:qPrefix)
                           OR UPPER(investor_loan_number)    LIKE UPPER(:qPrefix) THEN 2
                         ELSE 3
                       END AS rank
                  FROM loan_list_view
                 WHERE UPPER(application_number)     LIKE UPPER(:qPrefix)
                    OR UPPER(lendingpad_loan_number) LIKE UPPER(:qPrefix)
                    OR UPPER(mers_min)               LIKE UPPER(:qPrefix)
                    OR UPPER(investor_loan_number)   LIKE UPPER(:qPrefix)
                    OR UPPER(borrower_name)          LIKE UPPER(:qSubstr)
              ) ranked
             ORDER BY rank, application_number
             LIMIT :limit
            """;

        return jdbc.query(sql, p, (rs, i) -> new LoanSearchHit(
            rs.getLong("id"),
            rs.getString("application_number"),
            rs.getString("borrower_name"),
            rs.getString("property_city"),
            rs.getString("property_state"),
            rs.getString("status")
        ));
    }
}
