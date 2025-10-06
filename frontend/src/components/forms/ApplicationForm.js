/**
 * Main Application Form Component
 * Orchestrates all form steps and handles submission
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const { register, handleSubmit, control, formState: { errors }, trigger, getValues, watch, setValue } = useForm({
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
    isLastStep
  } = useFormSteps(7);

  const { borrowers, getFieldArray } = useBorrowerFieldArrays(control);

  useFormValidation(getValues, watch);

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
        loanPurpose: data.loanPurpose,
        loanType: data.loanType,
        loanAmount: parseFloat(data.loanAmount),
        propertyValue: parseFloat(data.propertyValue),
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

      await mortgageService.createApplication(applicationData);

      toast.success('Application submitted successfully!');
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
              clickableSteps={false}
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