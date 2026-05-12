package com.msfg.mortgage.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * AWS S3 client wiring. Credentials come from the SDK default credential chain:
 *   1. Java system properties / env vars (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 *   2. {@code ~/.aws/credentials} profile (used for local dev)
 *   3. EC2 instance role (used in prod via the CDK-created MortgageApp-{env}-AppInstanceRole)
 *
 * No code change needed when promoting from dev to prod — the IAM context comes from the
 * environment.
 */
@Configuration
public class S3Config {

    @Bean
    public Region awsRegion(@Value("${aws.region}") String region) {
        return Region.of(region);
    }

    @Bean(destroyMethod = "close")
    public S3Client s3Client(Region region) {
        return S3Client.builder().region(region).build();
    }

    @Bean(destroyMethod = "close")
    public S3Presigner s3Presigner(Region region) {
        return S3Presigner.builder().region(region).build();
    }
}
