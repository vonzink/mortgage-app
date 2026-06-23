package com.msfg.mortgage.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables @Scheduled support. Harmless without scheduled beans — the only scheduled bean
 * ({@code SuiteReconciliationJob}) is itself gated on {@code suite.reconcile.enabled=true}, so nothing
 * actually runs unless a deployment opts in.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
