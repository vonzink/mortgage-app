package com.yourcompany.mortgage.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * JPA configuration for enabling auditing and repository features
 */
@Configuration
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = "com.yourcompany.mortgage.repository")
@EnableTransactionManagement
public class JpaConfig {
    
    // JPA auditing and repository configuration
    // Auditing will automatically populate @CreatedDate and @LastModifiedDate fields
}
