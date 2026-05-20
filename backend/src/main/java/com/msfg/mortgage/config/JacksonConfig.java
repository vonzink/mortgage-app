package com.msfg.mortgage.config;

import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Register the Hibernate 6 Jackson module so lazy proxies don't blow up
 * serialization. With {@code FORCE_LAZY_LOADING=false} (default), uninitialized
 * proxies serialize as null instead of throwing
 * "No serializer found for ByteBuddyInterceptor".
 *
 * <p>This became a hard requirement once Liability.borrower (V22) introduced
 * @ManyToOne Borrower — Hibernate loads it as a proxy and any other code path
 * that touches LoanApplication.borrowers in the same session sees the proxy
 * in the collection.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Hibernate6Module hibernate6Module() {
        Hibernate6Module m = new Hibernate6Module();
        // Don't fetch lazy props during JSON write — emit null instead.
        m.disable(Hibernate6Module.Feature.FORCE_LAZY_LOADING);
        return m;
    }
}
