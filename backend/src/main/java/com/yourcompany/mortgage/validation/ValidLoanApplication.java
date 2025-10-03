package com.yourcompany.mortgage.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation for loan application business rules
 */
@Documented
@Constraint(validatedBy = LoanApplicationValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidLoanApplication {
    
    String message() default "Loan application validation failed";
    
    Class<?>[] groups() default {};
    
    Class<? extends Payload>[] payload() default {};
}
