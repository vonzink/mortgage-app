package com.msfg.mortgage;

import com.msfg.mortgage.config.DevIdentityProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(DevIdentityProperties.class)
public class MortgageApplication {

    public static void main(String[] args) {
        SpringApplication.run(MortgageApplication.class, args);
    }
}
