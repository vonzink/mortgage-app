/**
 * Main Application Form Component
 * Orchestrates all form steps and handles submission
 */
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaHome,
  FaUser,
  FaBriefcase,
  FaFileAlt,
  FaCheck
} from 'react-icons/fa';

// Custom hooks
import { useFormSteps } from '../../hooks/useFormSteps';
import { useBorrowerFieldArrays } from '../../hooks/useBorrowerFieldArrays';
import { useFormValidation } from '../../hooks/useFormValidation';

// Components
import ProgressIndicator from '../shared/ProgressIndicator';
import StepNavigation from '../shared/StepNavigation';
import LoanInformationStep from './LoanInformationStep';
import BorrowerInformationStep from './BorrowerInformationStep';
import PropertyDetailsStep from './PropertyDetailsStep';
import EmploymentStep from './EmploymentStep';
import AssetsLiabilitiesStep from './AssetsLiabilitiesStep';
import DeclarationsStep from './DeclarationsStep';
import ReviewSubmitStep from './ReviewSubmitStep';

// Services
import mortgageService from '../../services/mortgageService';

// Utils
import { createDefaultBorrower } from '../../utils/fieldArrayHelpers';

const ApplicationForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form setup
  const { register, handleSubmit, control, formState: { errors }, trigger, getValues, watch, setValue, reset } = useForm({
    defaultValues: {
      borrowers: [createDefaultBorrower(1)]
    }
  });

  // Custom hooks
  const {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    canGoNext,
    canGoPrev,
    isLastStep,
    visitedSteps
  } = useFormSteps(7);

  const { borrowers, getFieldArray } = useBorrowerFieldArrays(control);

  useFormValidation(getValues, watch);

  // Load application data if editing
  useEffect(() => {
    const loadApplicationData = async () => {
      if (editId) {
        try {
          setIsEditing(true);
          const applicationData = await mortgageService.getApplication(editId);
          
          console.log('[DEBUG] Loaded application data:', applicationData);
          
          // Map backend data to form structure
          const formData = {
            loanPurpose: applicationData.loanPurpose,
            loanType: applicationData.loanType,
            loanAmount: applicationData.loanAmount,
            propertyValue: applicationData.propertyValue,
            
            // Property fields
            property: applicationData.property,
            yearBuilt: applicationData.property?.yearBuilt,
            unitsCount: applicationData.property?.unitsCount,
            constructionType: applicationData.property?.constructionType,
            propertyUse: applicationData.property?.propertyType,
            
            // Borrowers with all nested data
            borrowers: (applicationData.borrowers || []).map(borrower => ({
              firstName: borrower.firstName,
              lastName: borrower.lastName,
              middleName: borrower.middleName,
              ssn: borrower.ssn,
              dateOfBirth: borrower.birthDate,
              maritalStatus: borrower.maritalStatus,
              email: borrower.email,
              phone: borrower.phone,
              citizenshipType: borrower.citizenshipType,
              dependents: borrower.dependentsCount,
              
              // Employment history
              employmentHistory: borrower.employmentHistory || [],
              
              // Income sources
              incomeSources: borrower.incomeSources || [],
              
              // Residences
              residences: borrower.residences || [],
              
              // Assets (if available)
              assets: borrower.assets || [],
              
              // Liabilities (if associated with borrower)
              liabilities: borrower.liabilities || [],
              
              // REO Properties
              reoProperties: borrower.reoProperties || []
            }))
          };
          
          // Add top-level liabilities if they exist
          if (applicationData.liabilities && applicationData.liabilities.length > 0) {
            // Merge with first borrower's liabilities or create structure
            if (formData.borrowers.length === 0) {
              formData.borrowers = [createDefaultBorrower(1)];
            }
          }
          
          console.log('[DEBUG] Mapped form data:', formData);
          
          // Populate form with application data
          reset(formData);
          
          toast.success('Application loaded for editing');
        } catch (error) {
          toast.error('Failed to load application for editing');
          console.error('Error loading application:', error);
          navigate('/applications');
        }
      }
    };
    
    loadApplicationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // Step definitions
  const steps = [
    { number: 1, title: 'Loan Info', icon: <FaHome />, description: 'Basic loan details' },
    { number: 2, title: 'Borrower', icon: <FaUser />, description: 'Personal details and residence history' },
    { number: 3, title: 'Property', icon: <FaHome />, description: 'Property information' },
    { number: 4, title: 'Employment', icon: <FaBriefcase />, description: 'Work and income details' },
    { number: 5, title: 'Assets', icon: <FaFileAlt />, description: 'Assets and liabilities including REO properties' },
    { number: 6, title: 'Declarations', icon: <FaFileAlt />, description: 'Mortgage declarations' },
    { number: 7, title: 'Submit', icon: <FaCheck />, description: 'Review and submit application' }
  ];

  // Navigation handlers
  const handleNextStep = async () => {
    const isStepValid = await trigger();
    if (isStepValid) {
      nextStep();
    } else {
      toast.error('Please fix the errors before proceeding to the next step.');
    }
  };

  const handlePrevStep = () => {
    prevStep();
  };

  const handleStepClick = (stepNumber) => {
    goToStep(stepNumber);
  };

  // Helper to check if a field has actual content
  const hasValue = (value) => {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  };

  // Form submission
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Transform the form data to match backend DTO structure
      const applicationData = {
        loanPurpose: data.loanPurpose || 'Purchase',
        loanType: data.loanType || 'Conventional',
        loanAmount: parseFloat(data.loanAmount) || 0,
        propertyValue: parseFloat(data.propertyValue) || 0,
        status: 'DRAFT',
          property: {
              addressLine: data.property?.addressLine || null,
              city: data.property?.city || null,
              state: data.property?.state || null,
              zipCode: data.property?.zipCode || null,
              propertyType: data.propertyUse === 'Primary' ? 'PrimaryResidence' :
                  data.propertyUse === 'Secondary' ? 'SecondHome' :
                      data.propertyUse || 'PrimaryResidence',
              propertyValue: parseFloat(data.propertyValue),
              constructionType: data.constructionType || 'SiteBuilt',
              yearBuilt: parseInt(data.yearBuilt) || null,
              unitsCount: parseInt(data.unitsCount) || 1
          },
        borrowers: data.borrowers
            .filter(borrower => hasValue(borrower.firstName) && hasValue(borrower.lastName))
            .map((borrower, index) => ({
              sequenceNumber: index + 1,
              firstName: borrower.firstName,
              lastName: borrower.lastName,
              middleName: borrower.middleName || null,
              ssn: borrower.ssn || null,
              birthDate: borrower.dateOfBirth || null,
              maritalStatus: borrower.maritalStatus || null,
              dependentsCount: parseInt(borrower.dependents) || 0,
              citizenshipType: borrower.citizenshipType || null,
              email: borrower.email || null,
              phone: borrower.phone || null,
              employmentHistory: (borrower.employmentHistory || [])
                  .filter(emp => hasValue(emp.employerName) && hasValue(emp.startDate) && hasValue(emp.employmentStatus))
                  .map((employment, empIndex) => ({
                    sequenceNumber: empIndex + 1,
                    employerName: employment.employerName,
                    position: employment.position || null,
                    startDate: employment.startDate,
                    endDate: employment.endDate || null,
                    employmentStatus: employment.employmentStatus,
                    monthlyIncome: parseFloat(employment.monthlyIncome) || 0,
                    employerAddress: employment.employerAddress || null,
                    employerCity: null,
                    employerState: null,
                    employerZip: null,
                    employerPhone: employment.employerPhone || null,
                    selfEmployed: false
                  })),
              incomeSources: (borrower.incomeSources || [])
                  .filter(income => hasValue(income.incomeType) && parseFloat(income.monthlyAmount) > 0)
                  .map((income) => ({
                    incomeType: income.incomeType,
                    monthlyAmount: parseFloat(income.monthlyAmount),
                    description: income.description || null
                  })),
              residences: (borrower.residences || [])
                  .filter(res => hasValue(res.addressLine))
                  .map((residence, resIndex) => ({
                    sequenceNumber: resIndex + 1,
                    addressLine: residence.addressLine,
                    city: residence.city || null,
                    state: residence.state || null,
                    zipCode: residence.zipCode || null,
                    residencyType: residence.residencyType || null,
                    residencyBasis: residence.residencyBasis || null,
                    durationMonths: parseInt(residence.durationMonths) || 0,
                    monthlyRent: parseFloat(residence.monthlyRent) || 0
                  })),
              reoProperties: (borrower.reoProperties || [])
                  .filter(reo => hasValue(reo.addressLine) && hasValue(reo.city))
                  .map((reo, reoIndex) => ({
                    sequenceNumber: reoIndex + 1,
                    addressLine: reo.addressLine,
                    city: reo.city,
                    state: reo.state || null,
                    zipCode: reo.zipCode || null,
                    propertyType: reo.propertyType || null,
                    propertyValue: parseFloat(reo.propertyValue) || 0,
                    monthlyRentalIncome: parseFloat(reo.monthlyRentalIncome) || 0,
                    monthlyPayment: parseFloat(reo.monthlyPayment) || 0,
                    unpaidBalance: parseFloat(reo.unpaidBalance) || 0
                  }))
            })),
        liabilities: data.borrowers
            .filter(borrower => hasValue(borrower.firstName) && hasValue(borrower.lastName))
            .flatMap(borrower =>
                (borrower.liabilities || [])
                    .filter(liability => hasValue(liability.creditorName) && hasValue(liability.liabilityType))
                    .map(liability => ({
                      creditorName: liability.creditorName,
                      accountNumber: liability.accountNumber || null,
                      liabilityType: liability.liabilityType,
                      monthlyPayment: parseFloat(liability.monthlyPayment) || 0,
                      unpaidBalance: parseFloat(liability.unpaidBalance) || 0,
                      payoffStatus: false,
                      toBePaidOff: false
                    }))
            )
      };

      console.log('[DEBUG] Sending application data:', JSON.stringify(applicationData, null, 2));

      // Always create a new application (even when editing)
      // This preserves the original and creates a new edited version
      await mortgageService.createApplication(applicationData);
      
      if (isEditing && editId) {
        toast.success('Edited application saved as new version!');
      } else {
        toast.success('Application submitted successfully!');
      }
      
      navigate('/applications');
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step content
    // Render current step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return <LoanInformationStep register={register} errors={errors} watch={watch} />;
            case 2:
                return (
                    <BorrowerInformationStep
                        register={register}
                        errors={errors}
                        watch={watch}
                        getValues={getValues}
                        setValue={setValue}
                        borrowerFields={borrowers.fields}
                        getFieldArray={getFieldArray}
                        appendBorrower={borrowers.append}
                        removeBorrower={borrowers.remove}
                    />
                );
            case 3:
                return <PropertyDetailsStep register={register} errors={errors} watch={watch} />;
            case 4:
                return (
                    <EmploymentStep
                        register={register}
                        errors={errors}
                        watch={watch}
                        getValues={getValues}
                        getFieldArray={getFieldArray}
                        borrowerFields={borrowers.fields}
                    />
                );
            case 5:
                return (
                    <AssetsLiabilitiesStep
                        register={register}
                        errors={errors}
                        watch={watch}
                        getValues={getValues}
                        getFieldArray={getFieldArray}
                        borrowerFields={borrowers.fields}
                    />
                );
            case 6:
                return (
                    <DeclarationsStep
                        register={register}
                        errors={errors}
                        watch={watch}
                        getValues={getValues}
                        borrowerFields={borrowers.fields}
                    />
                );
            case 7:
                return (
                    <ReviewSubmitStep
                        register={register}
                        errors={errors}
                        getValues={getValues}
                        onSubmit={handleSubmit(onSubmit)}
                        isSubmitting={isSubmitting}
                        isEditing={isEditing}
                    />
                );
            default:
                return null;
        }
    };

  return (
      <div className="application-form-container">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ProgressIndicator
              steps={steps}
              currentStep={currentStep}
              onStepClick={handleStepClick}
              clickableSteps={true}
              isEditing={isEditing}
              visitedSteps={visitedSteps}
          />

          <div className="step-content-container">
            {renderStepContent()}
          </div>

          {!isLastStep && (
              <StepNavigation
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  onPrev={handlePrevStep}
                  onNext={handleNextStep}
                  canGoNext={canGoNext}
                  canGoPrev={canGoPrev}
                  isSubmitting={isSubmitting}
              />
          )}
        </form>
      </div>
  );
};

export default ApplicationForm;