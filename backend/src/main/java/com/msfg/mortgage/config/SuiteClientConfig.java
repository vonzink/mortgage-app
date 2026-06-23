package com.msfg.mortgage.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class SuiteClientConfig {
    @Bean
    WebClient suiteWebClient(@Value("${suite.api.base-url:http://localhost:8080}") String baseUrl) {
        return WebClient.builder().baseUrl(baseUrl).build();
    }
}
