package com.yourcompany.mortgage.validation;

import com.yourcompany.mortgage.dto.LoanApplicationDTO;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.math.BigDecimal;
import java.util.List;

/**
 * Custom validator for loan application business rules
 */
public class LoanApplicationValidator implements ConstraintValidator<ValidLoanApplication, LoanApplicationDTO> {
    
    @Override
    public void initialize(ValidLoanApplication constraintAnnotation) {
        // Initialization logic if needed
    }
    
    @Override
    public boolean isValid(LoanApplicationDTO loanApplication, ConstraintValidatorContext context) {
        boolean isValid = true;
        
        // Validate loan amount vs property value
        if (loanApplication.getLoanAmount() != null && loanApplication.getPropertyValue() != null) {
            if (loanApplication.getLoanAmount().compareTo(loanApplication.getPropertyValue()) > 0) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate(
                        "Loan amount cannot exceed property value")
                        .addPropertyNode("loanAmount")
                        .addConstraintViolation();
                isValid = false;
            }
            
            // Validate loan-to-value ratio (should not exceed 100%)
            BigDecimal ltv = loanApplication.getLoanAmount()
                    .divide(loanApplication.getPropertyValue(), 4, BigDecimal.ROUND_HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            
            if (ltv.compareTo(BigDecimal.valueOf(100)) > 0) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate(
                        "Loan-to-value ratio cannot exceed 100%")
                        .addPropertyNode("loanAmount")
                        .addConstraintViolation();
                isValid = false;
            }
        }
        
        // Validate borrowers
        if (loanApplication.getBorrowers() != null && !loanApplication.getBorrowers().isEmpty()) {
            List<com.yourcompany.mortgage.dto.BorrowerDTO> borrowers = loanApplication.getBorrowers();
            
            // Check for duplicate borrowers (same SSN)
            for (int i = 0; i < borrowers.size(); i++) {
                for (int j = i + 1; j < borrowers.size(); j++) {
                    if (borrowers.get(i).getSsn() != null && 
                        borrowers.get(i).getSsn().equals(borrowers.get(j).getSsn())) {
                        context.disableDefaultConstraintViolation();
                        context.buildConstraintViolationWithTemplate(
                                "Duplicate borrower found with same SSN")
                                .addPropertyNode("borrowers[" + j + "].ssn")
                                .addConstraintViolation();
                        isValid = false;
                    }
                }
            }
            
            // Validate at least one borrower has required information
            boolean hasValidBorrower = borrowers.stream()
                    .anyMatch(borrower -> 
                            borrower.getFirstName() != null && !borrower.getFirstName().trim().isEmpty() &&
                            borrower.getLastName() != null && !borrower.getLastName().trim().isEmpty() &&
                            borrower.getSsn() != null && !borrower.getSsn().trim().isEmpty()
                    );
            
            if (!hasValidBorrower) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate(
                        "At least one borrower must have complete personal information")
                        .addPropertyNode("borrowers")
                        .addConstraintViolation();
                isValid = false;
            }
        } else {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                    "At least one borrower is required")
                    .addPropertyNode("borrowers")
                    .addConstraintViolation();
            isValid = false;
        }
        
        // Validate property information
        if (loanApplication.getProperty() == null) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                    "Property information is required")
                    .addPropertyNode("property")
                    .addConstraintViolation();
            isValid = false;
        }
        
        return isValid;
    }
}
