import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaUser, 
  FaBriefcase, 
  FaFileAlt, 
  FaCheck, 
  FaUserTie,
  FaArrowLeft, 
  FaArrowRight,
  FaSpinner
} from 'react-icons/fa';
import mortgageService from '../services/mortgageService';

const ApplicationForm = () => {
  const { register, handleSubmit, control, formState: { errors }, trigger, getValues, watch, setValue } = useForm({
    defaultValues: {
      borrowers: [{ 
        sequenceNumber: 1,
        employmentHistory: [{}],
        incomeSources: [{}],
        residences: [{}]
      }]
    }
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const totalSteps = 8;
  
  const steps = [
    { number: 1, title: 'Loan Information', icon: <FaHome />, description: 'Basic loan details' },
    { number: 2, title: 'Borrower Information', icon: <FaUser />, description: 'Personal details and residence history' },
    { number: 3, title: 'Property Details', icon: <FaHome />, description: 'Property information' },
    { number: 4, title: 'Employment & Income', icon: <FaBriefcase />, description: 'Work and income details' },
    { number: 5, title: 'Assets & Liabilities', icon: <FaFileAlt />, description: 'Assets and liabilities including REO properties' },
    { number: 6, title: 'Declarations', icon: <FaFileAlt />, description: 'Mortgage declarations' },
    { number: 7, title: 'Loan Officer Review', icon: <FaUserTie />, description: 'Loan officer review and XML export' },
    { number: 8, title: 'Review & Submit', icon: <FaCheck />, description: 'Review and submit application' }
  ];

  // Field arrays for dynamic sections
  const { fields: borrowerFields, append: appendBorrower, remove: removeBorrower } = useFieldArray({
    control,
    name: "borrowers"
  });

  // Create field arrays for up to 4 borrowers and their sub-fields
  const borrower0Employment = useFieldArray({ control, name: "borrowers.0.employmentHistory" });
  const borrower0Income = useFieldArray({ control, name: "borrowers.0.incomeSources" });
  const borrower0Residences = useFieldArray({ control, name: "borrowers.0.residences" });
  const borrower0Assets = useFieldArray({ control, name: "borrowers.0.assets" });
  const borrower0Liabilities = useFieldArray({ control, name: "borrowers.0.liabilities" });
  const borrower0Reo = useFieldArray({ control, name: "borrowers.0.reoProperties" });
  
  const borrower1Employment = useFieldArray({ control, name: "borrowers.1.employmentHistory" });
  const borrower1Income = useFieldArray({ control, name: "borrowers.1.incomeSources" });
  const borrower1Residences = useFieldArray({ control, name: "borrowers.1.residences" });
  const borrower1Assets = useFieldArray({ control, name: "borrowers.1.assets" });
  const borrower1Liabilities = useFieldArray({ control, name: "borrowers.1.liabilities" });
  const borrower1Reo = useFieldArray({ control, name: "borrowers.1.reoProperties" });
  
  const borrower2Employment = useFieldArray({ control, name: "borrowers.2.employmentHistory" });
  const borrower2Income = useFieldArray({ control, name: "borrowers.2.incomeSources" });
  const borrower2Residences = useFieldArray({ control, name: "borrowers.2.residences" });
  const borrower2Assets = useFieldArray({ control, name: "borrowers.2.assets" });
  const borrower2Liabilities = useFieldArray({ control, name: "borrowers.2.liabilities" });
  const borrower2Reo = useFieldArray({ control, name: "borrowers.2.reoProperties" });
  
  const borrower3Employment = useFieldArray({ control, name: "borrowers.3.employmentHistory" });
  const borrower3Income = useFieldArray({ control, name: "borrowers.3.incomeSources" });
  const borrower3Residences = useFieldArray({ control, name: "borrowers.3.residences" });
  const borrower3Assets = useFieldArray({ control, name: "borrowers.3.assets" });
  const borrower3Liabilities = useFieldArray({ control, name: "borrowers.3.liabilities" });
  const borrower3Reo = useFieldArray({ control, name: "borrowers.3.reoProperties" });
  
  // Helper function to get field array for a borrower
  const getFieldArray = (borrowerIndex, fieldName) => {
    try {
      const fieldArrays = [
        { 
          employmentHistory: borrower0Employment, 
          incomeSources: borrower0Income, 
          residences: borrower0Residences,
          assets: borrower0Assets,
          liabilities: borrower0Liabilities,
          reoProperties: borrower0Reo 
        },
        { 
          employmentHistory: borrower1Employment, 
          incomeSources: borrower1Income, 
          residences: borrower1Residences,
          assets: borrower1Assets,
          liabilities: borrower1Liabilities,
          reoProperties: borrower1Reo 
        },
        { 
          employmentHistory: borrower2Employment, 
          incomeSources: borrower2Income, 
          residences: borrower2Residences,
          assets: borrower2Assets,
          liabilities: borrower2Liabilities,
          reoProperties: borrower2Reo 
        },
        { 
          employmentHistory: borrower3Employment, 
          incomeSources: borrower3Income, 
          residences: borrower3Residences,
          assets: borrower3Assets,
          liabilities: borrower3Liabilities,
          reoProperties: borrower3Reo 
        }
      ];
      
      if (borrowerIndex < fieldArrays.length && fieldArrays[borrowerIndex] && fieldArrays[borrowerIndex][fieldName]) {
        return fieldArrays[borrowerIndex][fieldName];
      }
    } catch (error) {
      console.error('Error getting field array:', error);
    }
    
    // Return a safe default
    return { 
      fields: [], 
      append: () => {}, 
      remove: () => {},
      update: () => {},
      move: () => {},
      swap: () => {},
      insert: () => {}
    };
  };

  // Liabilities field array (for future use)
  // const { fields: liabilityFields, append: appendLiability, remove: removeLiability } = useFieldArray({
  //   control,
  //   name: "liabilities"
  // });

  // Step validation fields
  const stepValidationFields = {
    1: ['loanPurpose', 'loanType', 'loanAmount', 'propertyValue'],
    2: ['borrowers.0.firstName', 'borrowers.0.lastName', 'borrowers.0.ssn', 'borrowers.0.birthDate', 'borrowers.0.maritalStatus', 'borrowers.0.citizenshipType', 'borrowers.0.email', 'borrowers.0.phone'],
    3: ['propertyAddress', 'propertyCity', 'propertyState', 'propertyZip', 'propertyType'],
    4: ['borrowers.0.employmentHistory.0.employerName', 'borrowers.0.employmentHistory.0.position', 'borrowers.0.employmentHistory.0.monthlyIncome'],
    5: [],
    6: [],
    7: []
  };

  // Helper functions
  const addBorrower = () => {
    if (borrowerFields.length < 4) {
      appendBorrower({ 
        sequenceNumber: borrowerFields.length + 1,
        employmentHistory: [{}],
        incomeSources: [{}],
        residences: [{}]
      });
    }
  };

  const removeBorrowerAtIndex = (index) => {
    if (borrowerFields.length > 1) {
      removeBorrower(index);
    }
  };

  const populateSubjectPropertyFromResidence = (borrowerIndex, residenceIndex) => {
    const address = getValues(`borrowers.${borrowerIndex}.residences.${residenceIndex}.addressLine`);
    const city = getValues(`borrowers.${borrowerIndex}.residences.${residenceIndex}.city`);
    const state = getValues(`borrowers.${borrowerIndex}.residences.${residenceIndex}.state`);
    const zip = getValues(`borrowers.${borrowerIndex}.residences.${residenceIndex}.zipCode`);
    
    if (address && city && state && zip) {
      setValue('propertyAddress', address);
      setValue('propertyCity', city);
      setValue('propertyState', state);
      setValue('propertyZip', zip);
      
      // Show success message
      toast.success('Subject property address populated from residence history!');
    } else {
      toast.warning('Please fill in the residence address first.');
    }
  };

  // Helper function to calculate total residence history duration
  const calculateResidenceHistoryDuration = (borrowerIndex) => {
    const residences = getValues(`borrowers.${borrowerIndex}.residences`) || [];
    const totalMonths = residences.reduce((total, residence) => {
      const duration = parseInt(residence.durationMonths) || 0;
      return total + duration;
    }, 0);
    return totalMonths;
  };

  // Helper function to calculate total employment history duration
  const calculateEmploymentHistoryDuration = (borrowerIndex) => {
    const employments = getValues(`borrowers.${borrowerIndex}.employmentHistory`) || [];
    const totalMonths = employments.reduce((total, employment) => {
      const startDate = new Date(employment.startDate);
      const endDate = employment.employmentStatus === 'Present' ? new Date() : new Date(employment.endDate || new Date());
      
      if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
        return total + Math.max(0, months);
      }
      return total;
    }, 0);
    return totalMonths;
  };

  const handleNext = async () => {
    const fieldsToValidate = stepValidationFields[currentStep];
    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) {
        toast.error('Please fill in all required fields before continuing.');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = async (stepNumber) => {
    // Allow clicking on any step, but validate if going forward
    if (stepNumber < currentStep) {
      // Going backwards - no validation needed
      setCurrentStep(stepNumber);
    } else if (stepNumber > currentStep) {
      // Going forwards - validate current step first
      const fieldsToValidate = stepValidationFields[currentStep];
      if (fieldsToValidate && fieldsToValidate.length > 0) {
        const isValid = await trigger(fieldsToValidate);
        if (!isValid) {
          toast.error('Please complete the current step before jumping ahead.');
          return;
        }
      }
      setCurrentStep(stepNumber);
    } else {
      // Same step - no action needed
      return;
    }
    
    // Add a subtle animation feedback
    const stepElement = document.querySelector(`[data-step="${stepNumber}"]`);
    if (stepElement) {
      stepElement.style.transform = 'scale(0.95)';
      setTimeout(() => {
        stepElement.style.transform = '';
      }, 150);
    }
  };

  // XML Export Function
  const exportToXML = () => {
    try {
      const formData = getValues();
      
      // Create XML structure
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<MortgageApplication>
  <LoanInformation>
    <LoanType>${formData.loanType || ''}</LoanType>
    <LoanAmount>${formData.loanAmount || ''}</LoanAmount>
    <PropertyValue>${formData.propertyValue || ''}</PropertyValue>
    <DownPayment>${formData.downPayment || ''}</DownPayment>
    <DownPaymentSource>${formData.downPaymentSource || ''}</DownPaymentSource>
    <PropertyUse>${formData.propertyUse || ''}</PropertyUse>
    <PropertyType>${formData.propertyType || ''}</PropertyType>
    <Occupancy>${formData.occupancy || ''}</Occupancy>
  </LoanInformation>
  
  <PropertyDetails>
    <PropertyAddress>${formData.propertyAddress || ''}</PropertyAddress>
    <PropertyCity>${formData.propertyCity || ''}</PropertyCity>
    <PropertyState>${formData.propertyState || ''}</PropertyState>
    <PropertyZip>${formData.propertyZip || ''}</PropertyZip>
    <PropertyCounty>${formData.propertyCounty || ''}</PropertyCounty>
    <PropertyYearBuilt>${formData.propertyYearBuilt || ''}</PropertyYearBuilt>
    <PropertyBedrooms>${formData.propertyBedrooms || ''}</PropertyBedrooms>
    <PropertyBathrooms>${formData.propertyBathrooms || ''}</PropertyBathrooms>
    <PropertySquareFootage>${formData.propertySquareFootage || ''}</PropertySquareFootage>
  </PropertyDetails>
  
  <Borrowers>
    ${formData.borrowers?.map((borrower, index) => `
    <Borrower index="${index + 1}">
      <PersonalInformation>
        <FirstName>${borrower.firstName || ''}</FirstName>
        <LastName>${borrower.lastName || ''}</LastName>
        <MiddleName>${borrower.middleName || ''}</MiddleName>
        <SSN>${borrower.ssn || ''}</SSN>
        <DateOfBirth>${borrower.dateOfBirth || ''}</DateOfBirth>
        <MaritalStatus>${borrower.maritalStatus || ''}</MaritalStatus>
        <Dependents>${borrower.dependents || ''}</Dependents>
        <Email>${borrower.email || ''}</Email>
        <Phone>${borrower.phone || ''}</Phone>
      </PersonalInformation>
      
      <ResidenceHistory>
        ${borrower.residences?.map((residence, resIndex) => `
        <Residence index="${resIndex + 1}">
          <AddressLine>${residence.addressLine || ''}</AddressLine>
          <City>${residence.city || ''}</City>
          <State>${residence.state || ''}</State>
          <ZipCode>${residence.zipCode || ''}</ZipCode>
          <ResidencyType>${residence.residencyType || ''}</ResidencyType>
          <ResidencyBasis>${residence.residencyBasis || ''}</ResidencyBasis>
          <DurationMonths>${residence.durationMonths || ''}</DurationMonths>
          <MonthlyRent>${residence.monthlyRent || ''}</MonthlyRent>
        </Residence>
        `).join('') || '<Residence index="1"><AddressLine></AddressLine></Residence>'}
      </ResidenceHistory>
      
      <EmploymentHistory>
        ${borrower.employmentHistory?.map((employment, empIndex) => `
        <Employment index="${empIndex + 1}">
          <EmployerName>${employment.employerName || ''}</EmployerName>
          <Position>${employment.position || ''}</Position>
          <StartDate>${employment.startDate || ''}</StartDate>
          <EndDate>${employment.endDate || ''}</EndDate>
          <EmploymentStatus>${employment.employmentStatus || ''}</EmploymentStatus>
          <MonthlyIncome>${employment.monthlyIncome || ''}</MonthlyIncome>
          <EmployerAddress>${employment.employerAddress || ''}</EmployerAddress>
          <EmployerPhone>${employment.employerPhone || ''}</EmployerPhone>
        </Employment>
        `).join('') || '<Employment index="1"><EmployerName></EmployerName></Employment>'}
      </EmploymentHistory>
      
      <Assets>
        ${borrower.assets?.map((asset, assetIndex) => `
        <Asset index="${assetIndex + 1}">
          <AssetType>${asset.assetType || ''}</AssetType>
          <AccountNumber>${asset.accountNumber || ''}</AccountNumber>
          <BankName>${asset.bankName || ''}</BankName>
          <AssetValue>${asset.assetValue || ''}</AssetValue>
          <Verified>${asset.verified || ''}</Verified>
          <UsedForDownpayment>${asset.usedForDownpayment || false}</UsedForDownpayment>
        </Asset>
        `).join('') || '<Asset index="1"><AssetType></AssetType></Asset>'}
      </Assets>
      
      <Liabilities>
        ${borrower.liabilities?.map((liability, liabIndex) => `
        <Liability index="${liabIndex + 1}">
          <LiabilityType>${liability.liabilityType || ''}</LiabilityType>
          <CreditorName>${liability.creditorName || ''}</CreditorName>
          <AccountNumber>${liability.accountNumber || ''}</AccountNumber>
          <MonthlyPayment>${liability.monthlyPayment || ''}</MonthlyPayment>
          <UnpaidBalance>${liability.unpaidBalance || ''}</UnpaidBalance>
        </Liability>
        `).join('') || '<Liability index="1"><LiabilityType></LiabilityType></Liability>'}
      </Liabilities>
      
      <REOProperties>
        ${borrower.reoProperties?.map((reo, reoIndex) => `
        <REOProperty index="${reoIndex + 1}">
          <AddressLine>${reo.addressLine || ''}</AddressLine>
          <City>${reo.city || ''}</City>
          <State>${reo.state || ''}</State>
          <ZipCode>${reo.zipCode || ''}</ZipCode>
          <PropertyType>${reo.propertyType || ''}</PropertyType>
          <PropertyValue>${reo.propertyValue || ''}</PropertyValue>
          <MonthlyRentalIncome>${reo.monthlyRentalIncome || ''}</MonthlyRentalIncome>
          <MonthlyPayment>${reo.monthlyPayment || ''}</MonthlyPayment>
          <UnpaidBalance>${reo.unpaidBalance || ''}</UnpaidBalance>
          <AssociatedLiability>${reo.associatedLiability || ''}</AssociatedLiability>
        </REOProperty>
        `).join('') || ''}
      </REOProperties>
    </Borrower>
    `).join('') || '<Borrower index="1"><PersonalInformation><FirstName></FirstName></PersonalInformation></Borrower>'}
  </Borrowers>
  
  <Declarations>
    <Bankruptcy>${formData.bankruptcy || false}</Bankruptcy>
    <Foreclosure>${formData.foreclosure || false}</Foreclosure>
    <Lawsuit>${formData.lawsuit || false}</Lawsuit>
    <ObligatedOnLoan>${formData.obligatedOnLoan || false}</ObligatedOnLoan>
    <DelinquentFederalDebt>${formData.delinquentFederalDebt || false}</DelinquentFederalDebt>
    <DownPaymentBorrowed>${formData.downPaymentBorrowed || false}</DownPaymentBorrowed>
    <CoMakerEndorser>${formData.coMakerEndorser || false}</CoMakerEndorser>
    <USCitizen>${formData.usCitizen || false}</USCitizen>
    <PermanentResident>${formData.permanentResident || false}</PermanentResident>
    <PrimaryResidence>${formData.primaryResidence || false}</PrimaryResidence>
    <OwnershipInterest>${formData.ownershipInterest || false}</OwnershipInterest>
    <PropertyTitle>${formData.propertyTitle || ''}</PropertyTitle>
    <OutstandingJudgments>${formData.outstandingJudgments || false}</OutstandingJudgments>
    <PartyToLawsuit>${formData.partyToLawsuit || false}</PartyToLawsuit>
    <PropertyForeclosed>${formData.propertyForeclosed || false}</PropertyForeclosed>
    <DeclaredBankruptcy>${formData.declaredBankruptcy || false}</DeclaredBankruptcy>
    <AlimonyChildSupport>${formData.alimonyChildSupport || false}</AlimonyChildSupport>
    <DownPaymentGift>${formData.downPaymentGift || false}</DownPaymentGift>
    <CoBorrowerRelationship>${formData.coBorrowerRelationship || ''}</CoBorrowerRelationship>
  </Declarations>
  
  <ExportInformation>
    <ExportDate>${new Date().toISOString()}</ExportDate>
    <ApplicationVersion>1.0</ApplicationVersion>
  </ExportInformation>
</MortgageApplication>`;

      // Create and download the XML file
      const blob = new Blob([xmlData], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mortgage-application-${new Date().toISOString().split('T')[0]}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('XML file exported successfully!');
    } catch (error) {
      console.error('Error exporting XML:', error);
      toast.error('Failed to export XML file');
    }
  };

  // Step 1: Loan Information
  const renderLoanInformation = () => (
    <div className="step-content">
      <h3><FaHome /> Loan Information</h3>
      <p>Let's start with the basic details about your loan.</p>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="loanPurpose">Loan Purpose *</label>
          <select
            id="loanPurpose"
            {...register('loanPurpose', { required: 'Loan purpose is required' })}
          >
            <option value="">Select Loan Purpose</option>
            <option value="Purchase">Purchase</option>
            <option value="Refinance">Refinance</option>
            <option value="CashOut">Cash Out</option>
          </select>
          {errors.loanPurpose && (
            <span className="error-message">{errors.loanPurpose.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="loanType">Loan Type *</label>
          <select
            id="loanType"
            {...register('loanType', { required: 'Loan type is required' })}
          >
            <option value="">Select Loan Type</option>
            <option value="FHA">FHA</option>
            <option value="Conventional">Conventional</option>
            <option value="VA">VA</option>
            <option value="USDA">USDA</option>
          </select>
          {errors.loanType && (
            <span className="error-message">{errors.loanType.message}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="loanAmount">Loan Amount *</label>
          <input
            type="number"
            id="loanAmount"
            step="0.01"
            {...register('loanAmount', { 
              required: 'Loan amount is required',
              min: { value: 0.01, message: 'Loan amount must be greater than 0' }
            })}
            placeholder="500000"
          />
          {errors.loanAmount && (
            <span className="error-message">{errors.loanAmount.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="propertyValue">Property Value *</label>
          <input
            type="number"
            id="propertyValue"
            step="0.01"
            {...register('propertyValue', { 
              required: 'Property value is required',
              min: { value: 0.01, message: 'Property value must be greater than 0' }
            })}
            placeholder="600000"
          />
          {errors.propertyValue && (
            <span className="error-message">{errors.propertyValue.message}</span>
          )}
        </div>
      </div>
    </div>
  );

  // Step 3: Property Details
  const renderPropertyDetails = () => (
    <div className="step-content">
      <h3><FaHome /> Property Details</h3>
      <p>Tell us about the property you're looking to finance.</p>
      
      {/* Populate from residence history buttons */}
      <div className="address-populate-section">
        <h4>Quick Fill Options</h4>
        <p>Use a borrower's residence history to populate the subject property address:</p>
        <div className="populate-buttons">
          {borrowerFields.map((borrowerField, borrowerIndex) => {
            const borrower = getValues(`borrowers.${borrowerIndex}`);
            const borrowerName = borrower?.firstName && borrower?.lastName 
              ? `${borrower.firstName} ${borrower.lastName}` 
              : `Borrower ${borrowerIndex + 1}`;
            const residences = getValues(`borrowers.${borrowerIndex}.residences`) || [];
            
            return (
              <div key={borrowerIndex} className="borrower-populate-options">
                <h5>{borrowerName}</h5>
                {residences.length > 0 ? (
                  residences.map((residence, resIndex) => (
              <button
                      key={resIndex}
                type="button"
                      onClick={() => populateSubjectPropertyFromResidence(borrowerIndex, resIndex)}
                className="btn btn-outline-secondary btn-sm"
              >
                      Use Residence {resIndex + 1}
              </button>
                  ))
                ) : (
                  <p className="text-muted">No residence history available</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="propertyAddress">Property Address *</label>
        <input
          type="text"
          id="propertyAddress"
          {...register('propertyAddress', { required: 'Property address is required' })}
          placeholder="123 Main Street"
        />
        {errors.propertyAddress && (
          <span className="error-message">{errors.propertyAddress.message}</span>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="propertyCity">City *</label>
          <input
            type="text"
            id="propertyCity"
            {...register('propertyCity', { required: 'City is required' })}
            placeholder="Anytown"
          />
          {errors.propertyCity && (
            <span className="error-message">{errors.propertyCity.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="propertyState">State *</label>
          <input
            type="text"
            id="propertyState"
            {...register('propertyState', { required: 'State is required' })}
            placeholder="CA"
          />
          {errors.propertyState && (
            <span className="error-message">{errors.propertyState.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="propertyZip">ZIP Code *</label>
          <input
            type="text"
            id="propertyZip"
            {...register('propertyZip', { required: 'ZIP code is required' })}
            placeholder="12345"
          />
          {errors.propertyZip && (
            <span className="error-message">{errors.propertyZip.message}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="propertyCounty">County</label>
          <input
            type="text"
            id="propertyCounty"
            {...register('propertyCounty')}
            placeholder="Los Angeles"
          />
        </div>

        <div className="form-group">
          <label htmlFor="propertyType">Property Type *</label>
          <select
            id="propertyType"
            {...register('propertyType', { required: 'Property type is required' })}
          >
            <option value="">Select Property Type</option>
            <option value="PrimaryResidence">Primary Residence</option>
            <option value="SecondHome">Second Home</option>
            <option value="Investment">Investment</option>
          </select>
          {errors.propertyType && (
            <span className="error-message">{errors.propertyType.message}</span>
          )}
        </div>
      </div>
    </div>
  );

  // Step 2: Borrower Information
  const renderBorrowerInformation = () => (
    <div className="step-content">
      <h3><FaUser /> Borrower Information</h3>
      <p>Tell us about yourself and any co-borrowers (up to 4 total). You can use your current address to populate the subject property address in the next step.</p>
      
      {borrowerFields.map((field, borrowerIndex) => {
        
        return (
          <div key={field.id} className="borrower-section">
            <div className="borrower-header">
              <h4>Borrower {borrowerIndex + 1}</h4>
              {borrowerFields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBorrowerAtIndex(borrowerIndex)}
                  className="btn btn-danger btn-sm"
                >
                  Remove Borrower
                </button>
              )}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.firstName`}>First Name *</label>
                <input
                  type="text"
                  id={`borrowers.${borrowerIndex}.firstName`}
                  {...register(`borrowers.${borrowerIndex}.firstName`, { required: 'First name is required' })}
                  placeholder="John"
                />
                {errors.borrowers?.[borrowerIndex]?.firstName && (
                  <span className="error-message">{errors.borrowers[borrowerIndex].firstName.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.lastName`}>Last Name *</label>
                <input
                  type="text"
                  id={`borrowers.${borrowerIndex}.lastName`}
                  {...register(`borrowers.${borrowerIndex}.lastName`, { required: 'Last name is required' })}
                  placeholder="Doe"
                />
                {errors.borrowers?.[borrowerIndex]?.lastName && (
                  <span className="error-message">{errors.borrowers[borrowerIndex].lastName.message}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.ssn`}>SSN *</label>
                <input
                  type="text"
                  id={`borrowers.${borrowerIndex}.ssn`}
                  {...register(`borrowers.${borrowerIndex}.ssn`, { 
                    required: 'SSN is required',
                    pattern: {
                      value: /^\d{3}-?\d{2}-?\d{4}$/,
                      message: 'Please enter a valid SSN (XXX-XX-XXXX)'
                    }
                  })}
                  placeholder="123-45-6789"
                />
                {errors.borrowers?.[borrowerIndex]?.ssn && (
                  <span className="error-message">{errors.borrowers[borrowerIndex].ssn.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.birthDate`}>Birth Date *</label>
                <input
                  type="date"
                  id={`borrowers.${borrowerIndex}.birthDate`}
                  {...register(`borrowers.${borrowerIndex}.birthDate`, { required: 'Birth date is required' })}
                />
                {errors.borrowers?.[borrowerIndex]?.birthDate && (
                  <span className="error-message">{errors.borrowers[borrowerIndex].birthDate.message}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.maritalStatus`}>Marital Status *</label>
                <select
                  id={`borrowers.${borrowerIndex}.maritalStatus`}
                  {...register(`borrowers.${borrowerIndex}.maritalStatus`, { required: 'Marital status is required' })}
                >
                  <option value="">Select Marital Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>
                {errors.borrowers?.[borrowerIndex]?.maritalStatus && (
                  <span className="error-message">{errors.borrowers[borrowerIndex].maritalStatus.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.citizenshipType`}>Citizenship Type *</label>
                <select
                  id={`borrowers.${borrowerIndex}.citizenshipType`}
                  {...register(`borrowers.${borrowerIndex}.citizenshipType`, { required: 'Citizenship type is required' })}
                >
                  <option value="">Select Citizenship Type</option>
                  <option value="USCitizen">US Citizen</option>
                  <option value="PermanentResident">Permanent Resident</option>
                  <option value="NonPermanentResident">Non-Permanent Resident</option>
                </select>
                {errors.borrowers?.[borrowerIndex]?.citizenshipType && (
                  <span className="error-message">{errors.borrowers[borrowerIndex].citizenshipType.message}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.email`}>Email *</label>
                <input
                  type="email"
                  id={`borrowers.${borrowerIndex}.email`}
                  {...register(`borrowers.${borrowerIndex}.email`, { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  placeholder="john.doe@email.com"
                />
                {errors.borrowers?.[borrowerIndex]?.email && (
                  <span className="error-message">{errors.borrowers[borrowerIndex].email.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.phone`}>Phone *</label>
                <input
                  type="tel"
                  id={`borrowers.${borrowerIndex}.phone`}
                  {...register(`borrowers.${borrowerIndex}.phone`, { required: 'Phone is required' })}
                  placeholder="(555) 123-4567"
                />
                {errors.borrowers?.[borrowerIndex]?.phone && (
                  <span className="error-message">{errors.borrowers[borrowerIndex].phone.message}</span>
                )}
              </div>
            </div>


            {/* Residence History Section */}
            <div className="residence-history-section">
              <h5>Residence History</h5>
              {(() => {
                const { fields: resFields, append: appendRes, remove: removeRes } = getFieldArray(borrowerIndex, 'residences');
                const totalDuration = calculateResidenceHistoryDuration(borrowerIndex);
                const hasWarning = totalDuration < 24; // Less than 2 years
                
                return (
                  <>
                    {hasWarning && (
                      <div className="alert alert-warning">
                        <strong>Warning:</strong> Your residence history covers {Math.round(totalDuration)} months. 
                        Most lenders require at least 24 months (2 years) of residence history.
                      </div>
                    )}
                    
                    {resFields.map((resField, resIndex) => (
                      <div key={resField.id} className="residence-entry">
                        <div className="residence-header">
                          <h6>Residence {resIndex + 1}</h6>
                          {resFields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRes(resIndex)}
                              className="btn btn-danger btn-sm"
                            >
                              Remove Residence
                            </button>
                          )}
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.addressLine`}>Address</label>
                            <input
                              type="text"
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.addressLine`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.addressLine`)}
                              placeholder="123 Main Street"
                            />
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.city`}>City</label>
                            <input
                              type="text"
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.city`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.city`)}
                              placeholder="Anytown"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.state`}>State</label>
                            <input
                              type="text"
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.state`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.state`)}
                              placeholder="CA"
                              maxLength="2"
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.zipCode`}>ZIP Code</label>
                            <input
                              type="text"
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.zipCode`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.zipCode`)}
                              placeholder="12345"
                            />
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.residencyType`}>Residency Type</label>
                            <select
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.residencyType`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyType`)}
                            >
                              <option value="">Select Type</option>
                              <option value="Current">Current</option>
                              <option value="Prior">Prior</option>
                            </select>
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`}>Residency Basis</label>
                            <select
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`)}
                            >
                              <option value="">Select Basis</option>
                              <option value="Own">Own</option>
                              <option value="Rent">Rent</option>
                              <option value="LivingRentFree">Living Rent Free</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonths`}>Duration (Months)</label>
                            <input
                              type="number"
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonths`}
                              {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.durationMonths`)}
                              placeholder="12"
                            />
                          </div>
                          
                          {watch(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`) === 'Rent' && (
                          <div className="form-group">
                              <label htmlFor={`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`}>Monthly Rent *</label>
                            <input
                              type="number"
                              id={`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`}
                              step="0.01"
                                {...register(`borrowers.${borrowerIndex}.residences.${resIndex}.monthlyRent`, {
                                  required: watch(`borrowers.${borrowerIndex}.residences.${resIndex}.residencyBasis`) === 'Rent' ? 'Monthly rent is required for rental properties' : false
                                })}
                              placeholder="1500"
                            />
                              {errors.borrowers?.[borrowerIndex]?.residences?.[resIndex]?.monthlyRent && (
                                <span className="error-message">{errors.borrowers[borrowerIndex].residences[resIndex].monthlyRent.message}</span>
                              )}
                          </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {resFields.length < 6 && (
                      <div className="form-row">
                        <div className="form-group">
                          <button
                            type="button"
                            onClick={() => appendRes({ 
                              sequenceNumber: resFields.length + 1,
                              residencyType: 'Prior'
                            })}
                            className="btn btn-outline-primary"
                          >
                            Add Another Residence
                          </button>
                        </div>
                        
                        {borrowerIndex > 0 && (
                          <div className="form-group">
                            <button
                              type="button"
                              onClick={() => {
                                const borrower1CurrentResidence = getValues('borrowers.0.residences.0');
                                if (borrower1CurrentResidence?.addressLine && borrower1CurrentResidence?.city && borrower1CurrentResidence?.state && borrower1CurrentResidence?.zipCode) {
                                  appendRes({
                                    sequenceNumber: resFields.length + 1,
                                    residencyType: 'Prior',
                                    addressLine: borrower1CurrentResidence.addressLine,
                                    city: borrower1CurrentResidence.city,
                                    state: borrower1CurrentResidence.state,
                                    zipCode: borrower1CurrentResidence.zipCode,
                                    residencyBasis: borrower1CurrentResidence.residencyBasis,
                                    monthlyRent: borrower1CurrentResidence.monthlyRent,
                                    durationMonths: borrower1CurrentResidence.durationMonths
                                  });
                                  toast.success(`Borrower ${borrowerIndex + 1}'s residence populated from Borrower 1's current residence!`);
                                } else {
                                  toast.warning('Borrower 1 must have a complete current residence to use this feature.');
                                }
                              }}
                              className="btn btn-outline-secondary"
                            >
                              Use Borrower 1's Current Residence
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        );
      })}
      
      {borrowerFields.length < 4 && (
        <div className="form-row">
          <div className="form-group">
            <button
              type="button"
              onClick={addBorrower}
              className="btn btn-outline-primary"
            >
              Add Co-Borrower {borrowerFields.length + 1}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Step 4: Employment & Income
  const renderEmploymentIncome = () => (
    <div className="step-content">
      <h3><FaBriefcase /> Employment & Income</h3>
      <p>Tell us about employment and income sources for all borrowers (up to 6 employers per borrower).</p>
      
      {borrowerFields.map((borrowerField, borrowerIndex) => {
        const { fields: empFields, append: appendEmp, remove: removeEmp } = getFieldArray(borrowerIndex, 'employmentHistory');
        const totalEmploymentDuration = calculateEmploymentHistoryDuration(borrowerIndex);
        const hasEmploymentWarning = totalEmploymentDuration < 24; // Less than 2 years
        
        return (
          <div key={borrowerField.id} className="borrower-employment-section">
            <h4>Borrower {borrowerIndex + 1} - Employment History</h4>
            
            {hasEmploymentWarning && (
              <div className="alert alert-warning">
                <strong>Warning:</strong> Your employment history covers approximately {Math.round(totalEmploymentDuration)} months. 
                Most lenders require at least 24 months (2 years) of employment history.
              </div>
            )}
            
            {empFields.map((empField, empIndex) => (
              <div key={empField.id} className="employment-entry">
                <div className="employment-header">
                  <h5>Employer {empIndex + 1}</h5>
                  {empFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmp(empIndex)}
                      className="btn btn-danger btn-sm"
                    >
                      Remove Employer
                    </button>
                  )}
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerName`}>Employer Name *</label>
                    <input
                      type="text"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerName`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerName`, { required: 'Employer name is required' })}
                      placeholder="ABC Company"
                    />
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.employerName && (
                      <span className="error-message">{errors.borrowers[borrowerIndex].employmentHistory[empIndex].employerName.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.position`}>Position *</label>
                    <input
                      type="text"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.position`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.position`, { required: 'Position is required' })}
                      placeholder="Software Engineer"
                    />
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.position && (
                      <span className="error-message">{errors.borrowers[borrowerIndex].employmentHistory[empIndex].position.message}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`}>Monthly Income *</label>
                    <input
                      type="number"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`}
                      step="0.01"
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.monthlyIncome`, { 
                        required: 'Monthly income is required',
                        min: { value: 0.01, message: 'Income must be greater than 0' }
                      })}
                      placeholder="5000"
                    />
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.monthlyIncome && (
                      <span className="error-message">{errors.borrowers[borrowerIndex].employmentHistory[empIndex].monthlyIncome.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`}>Employment Status *</label>
                    <select
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`, { required: 'Employment status is required' })}
                    >
                      <option value="">Select Status</option>
                      <option value="Present">Present</option>
                      <option value="Prior">Prior</option>
                    </select>
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.employmentStatus && (
                      <span className="error-message">{errors.borrowers[borrowerIndex].employmentHistory[empIndex].employmentStatus.message}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.startDate`}>Start Date *</label>
                    <input
                      type="date"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.startDate`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.startDate`, { required: 'Start date is required' })}
                    />
                    {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.startDate && (
                      <span className="error-message">{errors.borrowers[borrowerIndex].employmentHistory[empIndex].startDate.message}</span>
                    )}
                  </div>

                </div>

                {watch(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`) !== 'Present' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.endDate`}>End Date *</label>
                      <input
                        type="date"
                        id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.endDate`}
                        {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.endDate`, { 
                          required: watch(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employmentStatus`) !== 'Present' ? 'End date is required for prior employment' : false
                        })}
                      />
                      {errors.borrowers?.[borrowerIndex]?.employmentHistory?.[empIndex]?.endDate && (
                        <span className="error-message">{errors.borrowers[borrowerIndex].employmentHistory[empIndex].endDate.message}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerPhone`}>Employer Phone</label>
                    <input
                      type="tel"
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerPhone`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.employerPhone`)}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.selfEmployed`}>Self Employed</label>
                    <select
                      id={`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.selfEmployed`}
                      {...register(`borrowers.${borrowerIndex}.employmentHistory.${empIndex}.selfEmployed`)}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            
            {empFields.length < 6 && (
              <div className="form-row">
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => appendEmp({ 
                      sequenceNumber: empFields.length + 1,
                      employmentStatus: 'Present',
                      selfEmployed: false
                    })}
                    className="btn btn-outline-primary"
                  >
                    Add Another Employer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Step 5: Review & Submit
  const renderReviewSubmit = () => {
    const formData = getValues();
    
    return (
      <div className="step-content">
        <h3><FaCheck /> Review & Submit</h3>
        <p>Please review your information before submitting your application.</p>
        
        <div className="review-sections">
          <div className="review-section">
            <h4>Loan Information</h4>
            <div className="review-item">
              <span className="label">Loan Purpose:</span>
              <span className="value">{formData.loanPurpose || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Loan Type:</span>
              <span className="value">{formData.loanType || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Loan Amount:</span>
              <span className="value">${formData.loanAmount ? parseFloat(formData.loanAmount).toLocaleString() : 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Property Value:</span>
              <span className="value">${formData.propertyValue ? parseFloat(formData.propertyValue).toLocaleString() : 'Not provided'}</span>
            </div>
          </div>

          <div className="review-section">
            <h4>Property Details</h4>
            <div className="review-item">
              <span className="label">Address:</span>
              <span className="value">{formData.propertyAddress || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">City, State ZIP:</span>
              <span className="value">{formData.propertyCity || 'Not provided'}, {formData.propertyState || 'Not provided'} {formData.propertyZip || 'Not provided'}</span>
            </div>
            <div className="review-item">
              <span className="label">Property Type:</span>
              <span className="value">{formData.propertyType || 'Not provided'}</span>
            </div>
          </div>

          <div className="review-section">
            <h4>Borrower Information</h4>
            {formData.borrowers?.map((borrower, index) => (
              <div key={index} className="borrower-review">
                <h5>Borrower {index + 1}</h5>
                <div className="review-item">
                  <span className="label">Name:</span>
                  <span className="value">{borrower.firstName || 'Not provided'} {borrower.lastName || 'Not provided'}</span>
                </div>
                <div className="review-item">
                  <span className="label">Email:</span>
                  <span className="value">{borrower.email || 'Not provided'}</span>
                </div>
                <div className="review-item">
                  <span className="label">Phone:</span>
                  <span className="value">{borrower.phone || 'Not provided'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="review-section">
            <h4>Employment & Income</h4>
            {formData.borrowers?.[0]?.employmentHistory?.[0] && (
              <>
                <div className="review-item">
                  <span className="label">Employer:</span>
                  <span className="value">{formData.borrowers[0].employmentHistory[0].employerName || 'Not provided'}</span>
                </div>
                <div className="review-item">
                  <span className="label">Position:</span>
                  <span className="value">{formData.borrowers[0].employmentHistory[0].position || 'Not provided'}</span>
                </div>
                <div className="review-item">
                  <span className="label">Monthly Income:</span>
                  <span className="value">${formData.borrowers[0].employmentHistory[0].monthlyIncome ? parseFloat(formData.borrowers[0].employmentHistory[0].monthlyIncome).toLocaleString() : 'Not provided'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Step 5: Assets & Liabilities
  const renderAssetsLiabilities = () => (
    <div className="step-content">
      <h3><FaFileAlt /> Assets & Liabilities</h3>
      <p>Tell us about your assets and liabilities, including any real estate owned (REO properties).</p>
      
      {borrowerFields.map((borrowerField, borrowerIndex) => {
        const { fields: reoResFields, append: appendReo, remove: removeReo } = getFieldArray(borrowerIndex, 'reoProperties');
        
        return (
          <div key={borrowerField.id} className="borrower-assets-liabilities-section">
            <h4>Borrower {borrowerIndex + 1}</h4>
            
            {/* Assets Section */}
            <div className="assets-section">
              <h5>Assets</h5>
              <p>Please list all your assets including bank accounts, investments, and other valuable assets.</p>
              
              {/* Borrower Selection for Multiple Borrowers */}
              {borrowerFields.length > 1 && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Borrower(s) for Assets:</label>
                    <div className="checkbox-group">
                      {borrowerFields.map((borrower, idx) => (
                        <label key={idx} className="checkbox-label">
                          <input
                            type="checkbox"
                            defaultChecked={idx === borrowerIndex}
                            onChange={(e) => {
                              if (e.target.checked && idx !== borrowerIndex) {
                                // Copy assets from this borrower to the current borrower
                                const sourceAssets = getValues(`borrowers.${idx}.assets`) || [];
                                const { append: appendAsset } = getFieldArray(borrowerIndex, 'assets');
                                sourceAssets.forEach(asset => appendAsset(asset));
                                toast.success(`Assets from Borrower ${idx + 1} added to Borrower ${borrowerIndex + 1}`);
                              }
                            }}
                          />
                          <span>Borrower {idx + 1}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Asset List */}
              <div className="asset-list-section">
                <h6>Asset List</h6>
                {(() => {
                  const { fields: assetFields, append: appendAsset, remove: removeAsset } = getFieldArray(borrowerIndex, 'assets');
                  return (
                    <>
                      {assetFields.length > 0 ? (
                        assetFields.map((assetField, assetIndex) => (
                          <div key={assetField.id} className="asset-entry">
                            <div className="asset-header">
                              <h6>Asset {assetIndex + 1}</h6>
                              <button
                                type="button"
                                onClick={() => removeAsset(assetIndex)}
                                className="btn btn-danger btn-sm"
                              >
                                Remove Asset
                              </button>
                            </div>
                            
                            <div className="form-row">
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.assets.${assetIndex}.assetType`}>Asset Type</label>
                                <select
                                  id={`borrowers.${borrowerIndex}.assets.${assetIndex}.assetType`}
                                  {...register(`borrowers.${borrowerIndex}.assets.${assetIndex}.assetType`)}
                                >
                                  <option value="">Select Asset Type</option>
                                  <option value="CheckingAccount">Checking Account</option>
                                  <option value="SavingsAccount">Savings Account</option>
                                  <option value="InvestmentAccount">Investment Account</option>
                                  <option value="Vehicle">Vehicle</option>
                                  <option value="RetirementAccount">Retirement Account (401k, IRA, etc.)</option>
                                  <option value="EarnestMoney">Earnest Money</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                              
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.assets.${assetIndex}.accountNumber`}>Account Number</label>
                                <input
                                  type="text"
                                  id={`borrowers.${borrowerIndex}.assets.${assetIndex}.accountNumber`}
                                  {...register(`borrowers.${borrowerIndex}.assets.${assetIndex}.accountNumber`)}
                                  placeholder="Account number, VIN, etc."
                                />
                              </div>
                            </div>
                            
                            <div className="form-row">
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.assets.${assetIndex}.bankName`}>Bank Name</label>
                                <input
                                  type="text"
                                  id={`borrowers.${borrowerIndex}.assets.${assetIndex}.bankName`}
                                  {...register(`borrowers.${borrowerIndex}.assets.${assetIndex}.bankName`)}
                                  placeholder="Chase Bank, Toyota Financial, etc."
                                />
                              </div>
                              
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.assets.${assetIndex}.assetValue`}>Amount</label>
                                <input
                                  type="number"
                                  id={`borrowers.${borrowerIndex}.assets.${assetIndex}.assetValue`}
                                  step="0.01"
                                  {...register(`borrowers.${borrowerIndex}.assets.${assetIndex}.assetValue`, { 
                                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                                  })}
                                  placeholder="50000"
                                />
                              </div>
                            </div>
                            
                            <div className="form-row">
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.assets.${assetIndex}.verified`}>Verified?</label>
                                <select
                                  id={`borrowers.${borrowerIndex}.assets.${assetIndex}.verified`}
                                  {...register(`borrowers.${borrowerIndex}.assets.${assetIndex}.verified`)}
                                >
                                  <option value="">Select Verification Status</option>
                                  <option value="true">Yes - Verified</option>
                                  <option value="false">No - Not Verified</option>
                                </select>
                              </div>
                              
                              <div className="form-group">
                                <label className="checkbox-label">
                                  <input
                                    type="checkbox"
                                    id={`borrowers.${borrowerIndex}.assets.${assetIndex}.usedForDownpayment`}
                                    {...register(`borrowers.${borrowerIndex}.assets.${assetIndex}.usedForDownpayment`)}
                                  />
                                  <span>Used for Down Payment</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-items-message">No assets added yet.</p>
                      )}
                      
                      <div className="form-row">
                        <div className="form-group">
                          <button
                            type="button"
                            onClick={() => appendAsset({ 
                              assetType: '', 
                              accountNumber: '', 
                              bankName: '', 
                              assetValue: '', 
                              verified: '',
                              usedForDownpayment: false
                            })}
                            className="btn btn-outline-primary"
                          >
                            Add Asset
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
            </div>
            
            {/* Liabilities Section */}
            <div className="liabilities-section">
              <h5>Liabilities</h5>
              <p>Please list all your debts and financial obligations.</p>
              
              {/* Borrower Selection for Multiple Borrowers */}
              {borrowerFields.length > 1 && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Select Borrower(s) for Liabilities:</label>
                    <div className="checkbox-group">
                      {borrowerFields.map((borrower, idx) => (
                        <label key={idx} className="checkbox-label">
                          <input
                            type="checkbox"
                            defaultChecked={idx === borrowerIndex}
                            onChange={(e) => {
                              if (e.target.checked && idx !== borrowerIndex) {
                                // Copy liabilities from this borrower to the current borrower
                                const sourceLiabilities = getValues(`borrowers.${idx}.liabilities`) || [];
                                const { append: appendLiability } = getFieldArray(borrowerIndex, 'liabilities');
                                sourceLiabilities.forEach(liability => appendLiability(liability));
                                toast.success(`Liabilities from Borrower ${idx + 1} added to Borrower ${borrowerIndex + 1}`);
                              }
                            }}
                          />
                          <span>Borrower {idx + 1}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Liability List */}
              <div className="liability-list-section">
                <h6>Liability List</h6>
                {(() => {
                  const { fields: liabilityFields, append: appendLiability, remove: removeLiability } = getFieldArray(borrowerIndex, 'liabilities');
                  return (
                    <>
                      {liabilityFields.length > 0 ? (
                        liabilityFields.map((liabilityField, liabilityIndex) => (
                          <div key={liabilityField.id} className="liability-entry">
                            <div className="liability-header">
                              <h6>Liability {liabilityIndex + 1}</h6>
                              <button
                                type="button"
                                onClick={() => removeLiability(liabilityIndex)}
                                className="btn btn-danger btn-sm"
                              >
                                Remove Liability
                              </button>
                            </div>
                            
                            <div className="form-row">
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.liabilityType`}>Liability Type *</label>
                                <select
                                  id={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.liabilityType`}
                                  {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.liabilityType`, { required: 'Liability type is required' })}
                                >
                                  <option value="">Select Liability Type</option>
                                  <option value="CreditCard">Credit Card</option>
                                  <option value="AutoLoan">Auto Loan</option>
                                  <option value="StudentLoan">Student Loan</option>
                                  <option value="PersonalLoan">Personal Loan</option>
                                  <option value="Mortgage">Mortgage</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                              
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.creditorName`}>Creditor Name *</label>
                                <input
                                  type="text"
                                  id={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.creditorName`}
                                  {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.creditorName`, { required: 'Creditor name is required' })}
                                  placeholder="e.g., Chase Bank, Toyota Financial, etc."
                                />
                              </div>
                            </div>
                            
                            <div className="form-row">
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.accountNumber`}>Account Number</label>
                                <input
                                  type="text"
                                  id={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.accountNumber`}
                                  {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.accountNumber`)}
                                  placeholder="Account number"
                                />
                              </div>
                              
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.monthlyPayment`}>Monthly Payment *</label>
                                <input
                                  type="number"
                                  id={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.monthlyPayment`}
                                  step="0.01"
                                  {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.monthlyPayment`, { 
                                    required: 'Monthly payment is required',
                                    min: { value: 0.01, message: 'Monthly payment must be greater than 0' }
                                  })}
                                  placeholder="500"
                                />
                              </div>
                            </div>
                            
                            <div className="form-row">
                              <div className="form-group">
                                <label htmlFor={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.unpaidBalance`}>Unpaid Balance *</label>
                                <input
                                  type="number"
                                  id={`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.unpaidBalance`}
                                  step="0.01"
                                  {...register(`borrowers.${borrowerIndex}.liabilities.${liabilityIndex}.unpaidBalance`, { 
                                    required: 'Unpaid balance is required',
                                    min: { value: 0.01, message: 'Unpaid balance must be greater than 0' }
                                  })}
                                  placeholder="15000"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="no-items-message">No liabilities added yet.</p>
                      )}
                      
                      <div className="form-row">
                        <div className="form-group">
                          <button
                            type="button"
                            onClick={() => appendLiability({ 
                              liabilityType: '', 
                              creditorName: '', 
                              accountNumber: '', 
                              monthlyPayment: '', 
                              unpaidBalance: '' 
                            })}
                            className="btn btn-outline-primary"
                          >
                            Add Liability
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            
            {/* REO Properties Section - Only show when REOs exist */}
            {reoResFields.length > 0 && (
              <div className="reo-properties-section">
                <h5>Real Estate Owned (REO) Properties</h5>
                <p>Properties you currently own that are not your primary residence.</p>
                
                {reoResFields.map((reoField, reoIndex) => {
                  const liabilities = getValues(`borrowers.${borrowerIndex}.liabilities`) || [];
                  return (
                    <div key={reoField.id} className="reo-entry">
                      <div className="reo-header">
                        <h6>REO Property {reoIndex + 1}</h6>
                        <button
                          type="button"
                          onClick={() => removeReo(reoIndex)}
                          className="btn btn-danger btn-sm"
                        >
                          Remove REO Property
                        </button>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.addressLine`}>Property Address *</label>
                          <input
                            type="text"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.addressLine`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.addressLine`, { required: 'Address is required' })}
                            placeholder="123 Main Street"
                          />
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.city`}>City *</label>
                          <input
                            type="text"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.city`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.city`, { required: 'City is required' })}
                            placeholder="Anytown"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.state`}>State *</label>
                          <input
                            type="text"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.state`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.state`, { required: 'State is required' })}
                            placeholder="CA"
                            maxLength="2"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.zipCode`}>ZIP Code *</label>
                          <input
                            type="text"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.zipCode`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.zipCode`, { required: 'ZIP code is required' })}
                            placeholder="12345"
                          />
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyType`}>Property Type *</label>
                          <select
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyType`}
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyType`, { required: 'Property type is required' })}
                          >
                            <option value="">Select Type</option>
                            <option value="PrimaryResidence">Primary Residence</option>
                            <option value="SecondHome">Second Home</option>
                            <option value="Investment">Investment</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyValue`}>Property Value *</label>
                          <input
                            type="number"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyValue`}
                            step="0.01"
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.propertyValue`, { required: 'Property value is required' })}
                            placeholder="300000"
                          />
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyRentalIncome`}>Monthly Rental Income</label>
                          <input
                            type="number"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyRentalIncome`}
                            step="0.01"
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyRentalIncome`)}
                            placeholder="2000"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`}>Monthly Payment</label>
                          <input
                            type="number"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`}
                            step="0.01"
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.monthlyPayment`)}
                            placeholder="1200"
                          />
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`}>Unpaid Balance</label>
                          <input
                            type="number"
                            id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`}
                            step="0.01"
                            {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.unpaidBalance`)}
                            placeholder="250000"
                          />
                        </div>
                      </div>
                      
                      {/* Link to Associated Liability */}
                      {liabilities.length > 0 && (
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.associatedLiability`}>Associated Liability (Optional)</label>
                            <select
                              id={`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.associatedLiability`}
                              {...register(`borrowers.${borrowerIndex}.reoProperties.${reoIndex}.associatedLiability`)}
                            >
                              <option value="">Select Associated Liability</option>
                              {liabilities.map((liability, liabilityIndex) => (
                                <option key={liabilityIndex} value={liabilityIndex}>
                                  {liability.creditorName} - {liability.liabilityType} (${liability.unpaidBalance})
                                </option>
                              ))}
                            </select>
                    </div>
                        </div>
                )}
                    </div>
                  );
                })}
                
              </div>
            )}
            
            {/* Add REO Property Button - Only show when no REOs exist */}
            {reoResFields.length === 0 && (
              <div className="form-row">
                <div className="form-group">
                  <button
                    type="button"
                    onClick={() => appendReo({ 
                      sequenceNumber: reoResFields.length + 1,
                      propertyType: 'Investment'
                    })}
                    className="btn btn-outline-primary"
                  >
                    Add REO Property
                  </button>
            </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Step 6: Declarations
  const renderDeclarations = () => (
    <div className="step-content">
      <h3><FaFileAlt /> Mortgage Declarations</h3>
      <p>Please answer the following questions truthfully. These declarations are required for your mortgage application.</p>
      
      {borrowerFields.map((borrowerField, borrowerIndex) => (
        <div key={borrowerField.id} className="borrower-declarations-section">
          <h4>Borrower {borrowerIndex + 1} - Declarations</h4>
          
          <div className="declarations-grid">
            <div className="declaration-group">
              <h5>Legal & Financial History</h5>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.outstandingJudgments`)}
                  />
                  Are there any outstanding judgments against you?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.bankruptcy`)}
                  />
                  Have you been declared bankrupt in the past 7 years?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.foreclosure`)}
                  />
                  Have you had property foreclosed upon or given title or deed in lieu thereof in the last 7 years?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.lawsuit`)}
                  />
                  Are you a party to a lawsuit?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.loanForeclosure`)}
                  />
                  Have you directly or indirectly been obligated on any loan which resulted in foreclosure, transfer of title in lieu of foreclosure, or judgment?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.presentlyDelinquent`)}
                  />
                  Are you presently delinquent or in default on any Federal debt or any other loan, mortgage, financial obligation, bond, or loan guarantee?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.alimonyChildSupport`)}
                  />
                  Are you obligated to pay alimony, child support, or separate maintenance?
                </label>
              </div>
            </div>
            
            <div className="declaration-group">
              <h5>Loan & Property Details</h5>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.borrowingDownPayment`)}
                  />
                  Is any part of the down payment borrowed?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.comakerEndorser`)}
                  />
                  Are you a co-maker or endorser on a note?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.usCitizen`)}
                    defaultChecked={true}
                  />
                  Are you a U.S. citizen?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.permanentResident`)}
                  />
                  Are you a permanent resident alien?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.intentToOccupy`)}
                    defaultChecked={true}
                  />
                  Do you intend to occupy the property as your primary residence?
                </label>
              </div>
            </div>
            
            <div className="declaration-group">
              <h5>Additional Information</h5>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.downPaymentGift`)}
                  />
                  Is any part of the down payment a gift?
                </label>
              </div>
              
              {watch(`borrowers.${borrowerIndex}.downPaymentGift`) && (
                <div className="conditional-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor={`borrowers.${borrowerIndex}.giftSource`}>Gift Source</label>
                      <input
                        type="text"
                        id={`borrowers.${borrowerIndex}.giftSource`}
                        {...register(`borrowers.${borrowerIndex}.giftSource`)}
                        placeholder="Family member, friend, etc."
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`borrowers.${borrowerIndex}.giftAmount`}>Gift Amount</label>
                      <input
                        type="number"
                        id={`borrowers.${borrowerIndex}.giftAmount`}
                        step="0.01"
                        {...register(`borrowers.${borrowerIndex}.giftAmount`)}
                        placeholder="50000"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.coSignerObligation`)}
                  />
                  Are you obligated to pay alimony, child support, or separate maintenance?
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.pendingCreditInquiry`)}
                  />
                  Are there any pending credit inquiries on your credit report?
                </label>
              </div>
              
              {watch(`borrowers.${borrowerIndex}.pendingCreditInquiry`) && (
                <div className="conditional-fields">
                  <div className="form-group">
                    <label htmlFor={`borrowers.${borrowerIndex}.creditExplanation`}>Credit Explanation</label>
                    <textarea
                      id={`borrowers.${borrowerIndex}.creditExplanation`}
                      {...register(`borrowers.${borrowerIndex}.creditExplanation`)}
                      placeholder="Please explain any credit inquiries or issues..."
                      rows="3"
                    />
                  </div>
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor={`borrowers.${borrowerIndex}.employmentGapExplanation`}>Employment Gap Explanation</label>
                <textarea
                  id={`borrowers.${borrowerIndex}.employmentGapExplanation`}
                  {...register(`borrowers.${borrowerIndex}.employmentGapExplanation`)}
                  placeholder="Please explain any gaps in employment history..."
                  rows="3"
                />
              </div>
            </div>
            
            <div className="declaration-group">
              <h5>Consents & Acknowledgments</h5>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.incomeVerificationConsent`)}
                    defaultChecked={true}
                  />
                  I consent to income verification and employment verification.
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.creditReportConsent`)}
                    defaultChecked={true}
                  />
                  I consent to credit report inquiries and verification.
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.propertyInsuranceRequired`)}
                    defaultChecked={true}
                  />
                  I understand that property insurance is required.
                </label>
              </div>
              
              <div className="declaration-item">
                <label>
                  <input
                    type="checkbox"
                    {...register(`borrowers.${borrowerIndex}.floodInsuranceRequired`)}
                  />
                  I understand that flood insurance may be required.
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Step 7: Loan Officer Review
  const renderLoanOfficerReview = () => (
    <div className="step-content">
      <h3><FaUserTie /> Loan Officer Review</h3>
      <p>Review the application data and export to XML for processing.</p>
      
      <div className="loan-officer-section">
        <div className="application-summary">
          <h4>Application Summary</h4>
          
          <div className="summary-grid">
            <div className="summary-item">
              <h5>Loan Information</h5>
              <p><strong>Loan Type:</strong> {getValues('loanType') || 'Not specified'}</p>
              <p><strong>Loan Amount:</strong> ${getValues('loanAmount') || '0'}</p>
              <p><strong>Property Value:</strong> ${getValues('propertyValue') || '0'}</p>
              <p><strong>Down Payment:</strong> ${getValues('downPayment') || '0'}</p>
            </div>
            
            <div className="summary-item">
              <h5>Property Details</h5>
              <p><strong>Address:</strong> {getValues('propertyAddress') || 'Not specified'}</p>
              <p><strong>City:</strong> {getValues('propertyCity') || 'Not specified'}</p>
              <p><strong>State:</strong> {getValues('propertyState') || 'Not specified'}</p>
              <p><strong>ZIP:</strong> {getValues('propertyZip') || 'Not specified'}</p>
            </div>
            
            <div className="summary-item">
              <h5>Borrowers</h5>
              {getValues('borrowers')?.map((borrower, index) => (
                <p key={index}><strong>Borrower {index + 1}:</strong> {borrower.firstName || ''} {borrower.lastName || ''}</p>
              ))}
            </div>
            
            <div className="summary-item">
              <h5>Assets & Liabilities</h5>
              <p><strong>Total Assets:</strong> {getValues('borrowers')?.reduce((total, borrower) => 
                total + (borrower.assets?.reduce((sum, asset) => sum + (parseFloat(asset.assetValue) || 0), 0) || 0), 0
              ).toLocaleString()}</p>
              <p><strong>Total Liabilities:</strong> {getValues('borrowers')?.reduce((total, borrower) => 
                total + (borrower.liabilities?.reduce((sum, liability) => sum + (parseFloat(liability.unpaidBalance) || 0), 0) || 0), 0
              ).toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="export-section">
          <h4>Export Options</h4>
          <p>Export the complete application data in XML format for further processing.</p>
          
          <div className="export-actions">
            <button
              type="button"
              onClick={exportToXML}
              className="btn btn-primary export-btn"
            >
              <FaFileAlt /> Export to XML
            </button>
            
            <div className="export-info">
              <p><strong>Export includes:</strong></p>
              <ul>
                <li>Complete loan information</li>
                <li>All borrower details and history</li>
                <li>Property information</li>
                <li>Employment and income data</li>
                <li>Assets and liabilities</li>
                <li>Real estate owned properties</li>
                <li>All declarations and consents</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="loan-officer-notes">
          <h4>Loan Officer Notes</h4>
          <div className="form-group">
            <label htmlFor="loanOfficerNotes">Additional Notes</label>
            <textarea
              id="loanOfficerNotes"
              {...register('loanOfficerNotes')}
              placeholder="Add any additional notes or observations about this application..."
              rows="6"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="loanOfficerName">Loan Officer Name</label>
              <input
                type="text"
                id="loanOfficerName"
                {...register('loanOfficerName')}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="reviewDate">Review Date</label>
              <input
                type="date"
                id="reviewDate"
                {...register('reviewDate')}
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderLoanInformation();
      case 2:
        return renderBorrowerInformation();
      case 3:
        return renderPropertyDetails();
      case 4:
        return renderEmploymentIncome();
      case 5:
        return renderAssetsLiabilities();
      case 6:
        return renderDeclarations();
      case 7:
        return renderLoanOfficerReview();
      case 8:
        return renderReviewSubmit();
      default:
        return null;
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Transform the form data to match backend DTO structure
      const applicationData = {
        loanPurpose: data.loanPurpose,
        loanType: data.loanType,
        loanAmount: parseFloat(data.loanAmount),
        propertyValue: parseFloat(data.propertyValue),
        property: {
          addressLine: data.propertyAddress,
          city: data.propertyCity,
          state: data.propertyState,
          zipCode: data.propertyZip,
          county: data.propertyCounty,
          propertyType: data.propertyType,
          propertyValue: parseFloat(data.propertyValue),
          constructionType: data.constructionType,
          yearBuilt: parseInt(data.yearBuilt),
          unitsCount: parseInt(data.unitsCount) || 1
        },
        borrowers: data.borrowers.map((borrower, index) => ({
          sequenceNumber: index + 1,
          firstName: borrower.firstName,
          lastName: borrower.lastName,
          ssn: borrower.ssn,
          birthDate: borrower.birthDate,
          maritalStatus: borrower.maritalStatus || 'Single',
          email: borrower.email,
          phone: borrower.phone,
          citizenshipType: borrower.citizenshipType || 'USCitizen',
          dependentsCount: parseInt(borrower.dependentsCount) || 0,
          employmentHistory: borrower.employmentHistory || [],
          incomeSources: borrower.incomeSources || [],
          residences: borrower.residences || [],
          declaration: {
            outstandingJudgments: borrower.outstandingJudgments || false,
            bankruptcy: borrower.bankruptcy || false,
            foreclosure: borrower.foreclosure || false,
            lawsuit: borrower.lawsuit || false,
            loanForeclosure: borrower.loanForeclosure || false,
            presentlyDelinquent: borrower.presentlyDelinquent || false,
            alimonyChildSupport: borrower.alimonyChildSupport || false,
            borrowingDownPayment: borrower.borrowingDownPayment || false,
            comakerEndorser: borrower.comakerEndorser || false,
            usCitizen: borrower.usCitizen !== undefined ? borrower.usCitizen : true,
            permanentResident: borrower.permanentResident || false,
            intentToOccupy: borrower.intentToOccupy !== undefined ? borrower.intentToOccupy : true
          }
        })),
        liabilities: data.liabilities || []
      };

      await mortgageService.createApplication(applicationData);
      toast.success('Application submitted successfully!');
      navigate('/applications');
    } catch (error) {
      toast.error('Failed to submit application. Please try again.');
      console.error('Application submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="application-form-container">
      {/* Progress Header */}
      <div className="card">
        <div className="progress-header">
          <h2><FaFileAlt /> Mortgage Application</h2>
          <p>Step {currentStep} of {totalSteps}: {steps[currentStep - 1].title}</p>
        </div>
        
        {/* Glowing Progress Bar */}
        <div className="progress-steps-container">
          <div 
            className="glow-progress-bar"
            style={{ '--progress-width': `${(currentStep / totalSteps) * 100}%` }}
          >
            <div className="progress-steps-overlay">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`progress-step-indicator ${
                    currentStep >= step.number ? 'active' : ''
                  } ${
                    currentStep > step.number ? 'completed' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="progress-steps">
          {steps.map((step) => (
            <div 
              key={step.number}
              data-step={step.number}
              className={`progress-step ${currentStep >= step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''} clickable`}
              onClick={() => handleStepClick(step.number)}
              title={`Click to go to ${step.title}`}
            >
              <div className="step-icon">
                {currentStep > step.number ? <FaCheck /> : step.icon}
              </div>
              <div className="step-info">
                <h4>{step.title}</h4>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)}>
          {renderStepContent()}
          
          {/* Navigation Buttons */}
          <div className="form-navigation">
            {currentStep > 1 && (
              <button 
                type="button" 
                onClick={handlePrevious}
                className="btn btn-secondary"
              >
                <FaArrowLeft /> Previous
              </button>
            )}
            
            <div className="nav-spacer"></div>
            
            {currentStep < totalSteps ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="btn btn-primary"
              >
                Next <FaArrowRight />
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="spinning" /> Submitting...
                  </>
                ) : (
                  <>
                    <FaCheck /> Submit Application
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;