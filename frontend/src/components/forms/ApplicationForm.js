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

// Utils — format raw values from the backend (e.g. unformatted MISMO-imported
// SSN/phone) before they reach the masked inputs. The PersonalInfoField mask
// only fires on user typing; initial values need to arrive pre-formatted.
import { formatSSN, formatPhone } from '../../utils/formHelpers';
import { debug } from '../../utils/debug';

// Components
import StepNavigation from '../shared/StepNavigation';
import { ApplyHero, ApplyProgressStrip } from '../design/ApplyChrome';
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
import { focusFirstInvalidField } from '../../utils/formErrorHelpers';
import { useDraftAutosave, clearDraft } from '../../hooks/useDraftAutosave';
import { formToApplicationPayload } from '../../utils/applicationPayload';

const ApplicationForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isViewing = searchParams.get('view') === '1';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // Form setup
  const { register, handleSubmit, control, formState: { errors }, trigger, getValues, watch, setValue, reset } = useForm({
    defaultValues: {
      borrowers: [createDefaultBorrower(1)]
    }
  });

  // Draft autosave — survives session-expired re-auth round-trips. Distinct keys for new
  // vs edit so we don't cross-contaminate.
  const draftKey = editId ? `draft:edit:${editId}` : 'draft:new';
  useDraftAutosave({
    watch, getValues, reset,
    storageKey: draftKey,
    enabled: !isViewing,
  });

  // Mirror the autosave for the "Auto-saved N sec ago" pill in the hero. We debounce
  // on the same cadence as the hook so the pill updates roughly in sync with each
  // sessionStorage write.
  useEffect(() => {
    if (isViewing) return;
    const subscription = watch(() => {
      // setTimeout matches useDraftAutosave's debounce window (1000ms default)
      const id = setTimeout(() => setLastSavedAt(Date.now()), 1100);
      return () => clearTimeout(id);
    });
    return () => subscription.unsubscribe();
  }, [watch, isViewing]);

  // Load carry-over data if available
  useEffect(() => {
    const carryOverData = sessionStorage.getItem('carryOverData');
    if (carryOverData && !editId) {
      try {
        const data = JSON.parse(carryOverData);
        debug('Loading carry-over data:', data);
        
        // Reset form with all the carried over data
        reset(data);
        
        // Clear the carry-over data from session storage
        sessionStorage.removeItem('carryOverData');
        
        toast.info('All data loaded from previous application');
      } catch (error) {
        console.error('Error loading carry-over data:', error);
      }
    }
  }, [editId, reset]);

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
    visitedSteps,
    setVisitedSteps
  } = useFormSteps(7, `${draftKey}:steps`);

  const { borrowers, getFieldArray } = useBorrowerFieldArrays(control);

  useFormValidation(getValues, watch);

  // Load application data if editing
  useEffect(() => {
    const loadApplicationData = async () => {
      if (editId) {
        try {
          debug('========== EDIT MODE ACTIVATED ==========');
          debug('Loading application ID:', editId);
          setIsEditing(true);
          const applicationData = await mortgageService.getApplication(editId);
          
          debug('Loaded application data from backend:', applicationData);
          
          // Reverse the propertyUse mapping that applicationPayload.js applies on submit:
          // form value ("Primary"/"Secondary"/"Investment") ↔ backend Property.propertyType
          // ("PrimaryResidence"/"SecondHome"/"Investment"). Without this, MISMO imports
          // (which write the long form) leave the form's Property Use dropdown blank
          // because the option values don't match.
          const reversePropertyUse = (raw) => {
            if (raw === 'PrimaryResidence') return 'Primary';
            if (raw === 'SecondHome') return 'Secondary';
            return raw || '';  // 'Investment' / '' / unknown → pass through
          };
          // Same shape, applied to the form's Occupancy dropdown
          // (OwnerOccupied / SecondHome / Investment) so an imported PrimaryResidence
          // surfaces as OwnerOccupied.
          const deriveOccupancy = (raw) => {
            if (raw === 'PrimaryResidence') return 'OwnerOccupied';
            if (raw === 'SecondHome') return 'SecondHome';
            if (raw === 'Investment') return 'Investment';
            return '';
          };

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
            propertyUse: reversePropertyUse(applicationData.property?.propertyType),
            occupancy: deriveOccupancy(applicationData.property?.propertyType),
            
            // Borrowers with all nested data
            borrowers: (applicationData.borrowers || []).map(borrower => ({
              firstName: borrower.firstName,
              lastName: borrower.lastName,
              middleName: borrower.middleName,
              ssn: formatSSN(borrower.ssn),
              dateOfBirth: borrower.birthDate,
              maritalStatus: borrower.maritalStatus,
              email: borrower.email,
              phone: formatPhone(borrower.phone),
              citizenshipType: borrower.citizenshipType,
              dependents: borrower.dependentsCount,
              
              // Employment history
              employmentHistory: borrower.employmentHistory || [],
              
              // Income sources
              incomeSources: borrower.incomeSources || [],
              
              // Residences
              residences: borrower.residences || [],
              
              // Assets
              assets: borrower.assets || [],
              
              // Liabilities - Will be populated from application-level liabilities below
              liabilities: [],
              
              // REO Properties
              reoProperties: borrower.reoProperties || [],
              
              // Declaration (flatten the nested object structure)
              ...((borrower.declaration) ? {
                usCitizen: borrower.declaration.usCitizen,
                permanentResident: borrower.declaration.permanentResident,
                intentToOccupy: borrower.declaration.intentToOccupy,
                borrowingDownPayment: borrower.declaration.borrowingDownPayment,
                downPaymentGift: borrower.declaration.downPaymentGift,
                giftSource: borrower.declaration.giftSource,
                giftAmount: borrower.declaration.giftAmount,
                comakerEndorser: borrower.declaration.comakerEndorser,
                outstandingJudgments: borrower.declaration.outstandingJudgments,
                lawsuit: borrower.declaration.lawsuit,
                foreclosure: borrower.declaration.foreclosure,
                bankruptcy: borrower.declaration.bankruptcy,
                alimonyChildSupport: borrower.declaration.alimonyChildSupport,
                coSignerObligation: borrower.declaration.coSignerObligation,
                presentlyDelinquent: borrower.declaration.presentlyDelinquent,
                loanForeclosure: borrower.declaration.loanForeclosure,
                pendingCreditInquiry: borrower.declaration.pendingCreditInquiry,
                propertyInsuranceRequired: borrower.declaration.propertyInsuranceRequired,
                floodInsuranceRequired: borrower.declaration.floodInsuranceRequired,
                creditReportConsent: borrower.declaration.creditReportConsent,
                incomeVerificationConsent: borrower.declaration.incomeVerificationConsent,
                creditExplanation: borrower.declaration.creditExplanation,
                employmentGapExplanation: borrower.declaration.employmentGapExplanation,
                // HMDA round-trip — backend stores comma-separated MISMO codes;
                // form's HmdaSection toggles values in/out of the same string.
                hmdaRace: borrower.declaration.hmdaRace,
                hmdaRaceRefusal: borrower.declaration.hmdaRaceRefusal,
                hmdaEthnicity: borrower.declaration.hmdaEthnicity,
                hmdaEthnicityRefusal: borrower.declaration.hmdaEthnicityRefusal,
                hmdaEthnicityOrigin: borrower.declaration.hmdaEthnicityOrigin,
                hmdaSex: borrower.declaration.hmdaSex,
                hmdaSexRefusal: borrower.declaration.hmdaSexRefusal,
                applicationTakenMethod: borrower.declaration.applicationTakenMethod,
              } : {})
            }))
          };
          
          // Add application-level liabilities to first borrower
          // (All assets/liabilities are stored under borrowers[0] in the form)
          if (applicationData.liabilities && applicationData.liabilities.length > 0) {
            if (formData.borrowers.length === 0) {
              formData.borrowers = [createDefaultBorrower(1)];
            }
            formData.borrowers[0].liabilities = applicationData.liabilities;
          }
          
          debug('Mapped form data:', formData);
          
          // Populate form with application data
          reset(formData);
          
          // Mark all steps as visited to allow free navigation when editing
          setVisitedSteps(new Set([1, 2, 3, 4, 5, 6, 7]));
          
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
    { number: 5, title: 'Finances', icon: <FaFileAlt />, description: 'Assets, liabilities, and real estate owned' },
    { number: 6, title: 'Declarations', icon: <FaFileAlt />, description: 'Mortgage declarations' },
    { number: 7, title: 'Submit', icon: <FaCheck />, description: 'Review and submit application' }
  ];

  // Navigation handlers
  const handleNextStep = async () => {
    const isStepValid = await trigger();
    if (isStepValid) {
      nextStep();
      return;
    }
    // Validation failed → don't toast (the inline error spans + role="alert" do
    // the announcing). Instead, scroll the first invalid field into view and
    // focus it so the user lands exactly where they need to fix something.
    focusFirstInvalidField(errors);
  };

  const handlePrevStep = () => {
    prevStep();
  };

  const handleStepClick = (stepNumber) => {
    goToStep(stepNumber);
  };

  // Form submission
  const onSubmit = async (data) => {
    debug('========== FORM SUBMISSION STARTED ==========');
    debug('Raw form data:', data);

    setIsSubmitting(true);
    try {
      // Form → backend DTO conversion lives in utils/applicationPayload.js
      // (pure, unit-tested). Keeps this handler focused on UI flow + API I/O.
      const applicationData = formToApplicationPayload(data);

      debug('Final application data to send:', JSON.stringify(applicationData, null, 2));
      debug('Number of borrowers:', applicationData.borrowers?.length);
      debug('Number of liabilities:', applicationData.liabilities?.length);

      // Edit mode actually updates the existing record; new mode creates fresh.
      // (Previously this always created a new "version" — that behavior was removed.)
      let savedApplication;
      if (isEditing && editId) {
        debug('EDIT MODE: Updating application', editId);
        savedApplication = await mortgageService.updateApplication(editId, applicationData);
      } else {
        debug('NEW APPLICATION: Creating fresh application');
        savedApplication = await mortgageService.createApplication(applicationData);
      }
      debug('Application saved successfully! Response:', savedApplication);

      // Successful submit — drop the autosaved draft + step state so a fresh New
      // Application starts at step 1.
      clearDraft(draftKey);
      clearDraft(`${draftKey}:steps`);

      toast.success(isEditing ? 'Application updated successfully!' : 'Application submitted successfully!');
      
      // Navigate to My Applications after a brief delay to show the success message
      setTimeout(() => {
        navigate('/applications');
      }, 1000);
    } catch (error) {
      console.error('[ERROR] Submission failed:', error);
      console.error('[ERROR] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Show specific error message
      let errorMessage = 'Failed to submit application. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.fieldErrors) {
        errorMessage = 'Validation errors: ' + Object.entries(error.response.data.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
          .join('; ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step content
    // Render current step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return <LoanInformationStep register={register} errors={errors} watch={watch} setValue={setValue} getValues={getValues} />;
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
                return <PropertyDetailsStep register={register} errors={errors} watch={watch} getValues={getValues} setValue={setValue} />;
            case 4:
                return (
                    <EmploymentStep
                        register={register}
                        errors={errors}
                        watch={watch}
                        getValues={getValues}
                        setValue={setValue}
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
                        setValue={setValue}
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
                        setValue={setValue}
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
                        isViewing={isViewing}
                    />
                );
            default:
                return null;
        }
    };

  // Strip-level applicationNumber for the eyebrow — pulled out of carry-over / loaded data.
  const applicationNumber = getValues('applicationNumber') || null;

  const handleSaveAndExit = () => {
    // useDraftAutosave already wrote to sessionStorage; bounce to the list.
    // Honest wording: drafts live in this browser's sessionStorage only and
    // do NOT show up in the Applications list until the user submits. Don't
    // imply a server-side save here.
    toast.info('Draft saved on this device. Submit to send to your loan officer.');
    navigate('/applications');
  };

  return (
      <div className="page apply-page">
        <ApplyHero
          applicationNumber={applicationNumber}
          isEditing={isEditing}
          lastSavedAt={lastSavedAt}
          onSaveAndExit={isViewing ? null : handleSaveAndExit}
          onContinue={!isLastStep && !isViewing ? handleNextStep : null}
          continueLabel={currentStep === totalSteps - 1 ? 'Continue to review' : 'Continue'}
        />

        <ApplyProgressStrip
          currentStep={currentStep}
          visitedSteps={visitedSteps}
          onStepClick={handleStepClick}
          estTimeRemaining={null}
        />

        <form onSubmit={handleSubmit(onSubmit)} className="apply-form">
          <div className="card apply-form-card">
            <fieldset disabled={isViewing} style={{ border: 'none', padding: 0, margin: 0 }}>
              {renderStepContent()}
            </fieldset>

            {!isLastStep && (
              <div className="apply-form-footer">
                <StepNavigation
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    onPrev={handlePrevStep}
                    onNext={handleNextStep}
                    canGoNext={canGoNext}
                    canGoPrev={canGoPrev}
                    isSubmitting={isSubmitting}
                />
              </div>
            )}
          </div>
        </form>
      </div>
  );
};

export default ApplicationForm;