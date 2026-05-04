package com.yourcompany.mortgage.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Singleton closing-stage data for a loan application (1:1). Filled in by the LO between
 * Declarations and Review/Submit, or populated from a MISMO file. Itemized fees live in
 * {@link ClosingFee}; real-estate agents in {@link LoanAgent}.
 */
@Entity
@Table(name = "closing_information")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClosingInformation {

    @Id
    @Column(name = "loan_application_id")
    private Long loanApplicationId;

    @JsonBackReference
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "loan_application_id")
    private LoanApplication application;

    // Closing logistics
    @Column(name = "closing_date")
    private LocalDate closingDate;

    @Column(name = "closing_time", length = 20)
    private String closingTime;

    @Column(name = "closing_method", length = 50)
    private String closingMethod;

    @Column(name = "closing_company_name")
    private String closingCompanyName;

    @Column(name = "closing_company_phone", length = 20)
    private String closingCompanyPhone;

    // Title
    @Column(name = "title_company_name")
    private String titleCompanyName;

    @Column(name = "title_company_phone", length = 20)
    private String titleCompanyPhone;

    @Column(name = "title_company_email")
    private String titleCompanyEmail;

    @Column(name = "title_insurance_amount", precision = 15, scale = 2)
    private BigDecimal titleInsuranceAmount;

    // Appraisal
    @Column(name = "appraisal_mgmt_company")
    private String appraisalMgmtCompany;

    @Column(name = "appraiser_name")
    private String appraiserName;

    @Column(name = "appraised_value", precision = 15, scale = 2)
    private BigDecimal appraisedValue;

    @Column(name = "appraisal_date")
    private LocalDate appraisalDate;

    @Column(name = "appraisal_fee", precision = 15, scale = 2)
    private BigDecimal appraisalFee;

    // Mortgage insurance
    @Column(name = "mi_type", length = 30)
    private String miType;

    @Column(name = "mi_monthly_amount", precision = 10, scale = 2)
    private BigDecimal miMonthlyAmount;

    @Column(name = "mi_upfront_amount", precision = 15, scale = 2)
    private BigDecimal miUpfrontAmount;

    @Column(name = "mi_lifetime_indicator")
    private Boolean miLifetimeIndicator;

    // Hazard insurance
    @Column(name = "hazard_insurance_company")
    private String hazardInsuranceCompany;

    @Column(name = "hazard_insurance_annual_premium", precision = 15, scale = 2)
    private BigDecimal hazardInsuranceAnnualPremium;

    @Column(name = "hazard_insurance_escrowed")
    private Boolean hazardInsuranceEscrowed;

    // Seller
    @Column(name = "seller_name")
    private String sellerName;

    @Column(name = "seller_phone", length = 20)
    private String sellerPhone;

    @Column(name = "seller_email")
    private String sellerEmail;

    @Column(name = "seller_concession_amount", precision = 15, scale = 2)
    private BigDecimal sellerConcessionAmount;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
