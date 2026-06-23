package com.msfg.mortgage.scheduler;

import com.msfg.mortgage.service.LoanApplicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Self-healing re-drive for funnel intakes whose synchronous suite hand-off failed (a transient suite
 * outage left {@code suite_loan_id} null). Periodically retries {@code createFromIntake}'s suite call
 * so those loans eventually land in the system of record.
 *
 * <p>Off by default — enable per environment with {@code suite.reconcile.enabled=true} (prod). The
 * bean only exists when enabled, so no scheduling runs in tests/local.
 */
@Component
@ConditionalOnProperty(name = "suite.reconcile.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class SuiteReconciliationJob {

    private final LoanApplicationService loanApplicationService;

    @Scheduled(
            initialDelayString = "${suite.reconcile.initial-delay-ms:60000}",
            fixedDelayString = "${suite.reconcile.interval-ms:300000}")
    public void redrive() {
        try {
            int n = loanApplicationService.redriveSuiteHandoffs();
            if (n > 0) log.info("Suite re-drive: reconciled {} pending application(s)", n);
        } catch (RuntimeException e) {
            // Never let a re-drive pass kill the scheduler thread — log + try again next interval.
            log.warn("Suite re-drive pass failed: {}", e.toString());
        }
    }
}
