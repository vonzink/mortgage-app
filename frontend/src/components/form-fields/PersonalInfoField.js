/**
 * Personal Information Field Component
 * Reusable personal information input component
 */
import React from 'react';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { formatSSN, formatPhone } from '../../utils/formHelpers';

const DEPENDENTS_MIN = 0;
const DEPENDENTS_MAX = 10;

const PersonalInfoField = ({
  register,
  errors,
  setValue,
  watch,
  prefix = '',
  required = false,
  label = 'Personal Information'
}) => {
  const getFieldName = (field) => prefix ? `${prefix}.${field}` : field;
  const getError = (field) => prefix ? errors[prefix]?.[field] : errors[field];

  /**
   * Wire react-hook-form's register into a controlled input that reformats on every keystroke.
   * The stored value is the formatted version (e.g. `123-45-6789`), so the backend gets
   * something the regex validators are happy with.
   */
  const maskedRegister = (fieldName, validation, format) => {
    const reg = register(fieldName, validation);
    return {
      ...reg,
      onChange: (e) => {
        const formatted = format(e.target.value);
        e.target.value = formatted;
        return reg.onChange(e);
      },
    };
  };

  return (
    <div className="personal-info-fields">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={getFieldName('firstName')}>
            First Name {required && '*'}
          </label>
          <input
            type="text"
            id={getFieldName('firstName')}
            {...register(getFieldName('firstName'), { 
              required: required ? 'First name is required' : false 
            })}
            placeholder="John"
            className={getError('firstName') ? 'error' : ''}
          />
          {getError('firstName') && (
            <span className="error-message" role="alert">{getError('firstName').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('lastName')}>
            Last Name {required && '*'}
          </label>
          <input
            type="text"
            id={getFieldName('lastName')}
            {...register(getFieldName('lastName'), { 
              required: required ? 'Last name is required' : false 
            })}
            placeholder="Doe"
            className={getError('lastName') ? 'error' : ''}
          />
          {getError('lastName') && (
            <span className="error-message" role="alert">{getError('lastName').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('middleName')}>
            Middle Name
          </label>
          <input
            type="text"
            id={getFieldName('middleName')}
            {...register(getFieldName('middleName'))}
            placeholder="Michael"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor={getFieldName('ssn')}>
            Social Security Number
          </label>
          <input
            type="text"
            id={getFieldName('ssn')}
            {...maskedRegister(getFieldName('ssn'), {
              pattern: {
                value: /^\d{3}-\d{2}-\d{4}$/,
                message: 'Invalid SSN format'
              }
            }, formatSSN)}
            placeholder="xxx-xx-xxxx"
            inputMode="numeric"
            autoComplete="off"
            className={getError('ssn') ? 'error' : ''}
          />
          {getError('ssn') && (
            <span className="error-message" role="alert">{getError('ssn').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('dateOfBirth')}>
            Date of Birth
          </label>
          <input
            type="date"
            id={getFieldName('dateOfBirth')}
            {...register(getFieldName('dateOfBirth'))}
            className={getError('dateOfBirth') ? 'error' : ''}
          />
          {getError('dateOfBirth') && (
            <span className="error-message" role="alert">{getError('dateOfBirth').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('maritalStatus')}>
            Marital Status
          </label>
          <select
            id={getFieldName('maritalStatus')}
            {...register(getFieldName('maritalStatus'))}
            className={getError('maritalStatus') ? 'error' : ''}
          >
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
          {getError('maritalStatus') && (
            <span className="error-message" role="alert">{getError('maritalStatus').message}</span>
          )}
        </div>
      </div>

      {/* Dependents — − N + stepper. Bounded 0..10 (URLA practical max). The
          parent passes setValue/watch from useForm so the stepper can read the
          current count and write a clean integer back to RHF state. Falls back
          to the plain input only if the parent didn't pass setValue/watch. */}
      {(setValue && watch) ? (
        <DependentsStepper
          name={getFieldName('dependents')}
          register={register}
          setValue={setValue}
          watch={watch}
        />
      ) : (
        <div className="form-row">
          <div className="form-group">
            <label htmlFor={getFieldName('dependents')}>Number of Dependents</label>
            <input
              type="number"
              id={getFieldName('dependents')}
              {...register(getFieldName('dependents'))}
              placeholder="0"
              min="0"
              max={DEPENDENTS_MAX}
            />
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor={getFieldName('email')}>
            Email Address {required && '*'}
          </label>
          <input
            type="email"
            id={getFieldName('email')}
            {...register(getFieldName('email'), { 
              required: required ? 'Email is required' : false,
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email format'
              }
            })}
            placeholder="john.doe@email.com"
            className={getError('email') ? 'error' : ''}
          />
          {getError('email') && (
            <span className="error-message" role="alert">{getError('email').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('phone')}>
            Phone Number {required && '*'}
          </label>
          <input
            type="tel"
            id={getFieldName('phone')}
            {...maskedRegister(getFieldName('phone'), {
              required: required ? 'Phone number is required' : false,
              pattern: {
                value: /^\d{3}-\d{3}-\d{4}$/,
                message: 'Invalid phone number format'
              }
            }, formatPhone)}
            placeholder="xxx-xxx-xxxx"
            inputMode="tel"
            autoComplete="tel"
            className={getError('phone') ? 'error' : ''}
          />
          {getError('phone') && (
            <span className="error-message" role="alert">{getError('phone').message}</span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * − N +  number stepper for the dependents count. Reads the current value via
 * RHF's watch(); writes via setValue with shouldDirty so the dirty state stays
 * accurate for autosave. The hidden registered <input> keeps the field part of
 * the form schema for unchanged submission semantics. Range clamped to 0..10.
 */
function DependentsStepper({ name, register, setValue, watch }) {
  const raw = watch(name);
  const value = clampDependents(raw);

  const set = (next) => {
    const clamped = clampDependents(next);
    setValue(name, clamped, { shouldDirty: true, shouldValidate: false });
  };

  return (
    <div className="form-row">
      <div className="form-group">
        <label htmlFor={name}>Number of Dependents</label>
        <div className="num-stepper" role="group" aria-label="Number of dependents">
          <button
            type="button"
            className="num-stepper-btn"
            onClick={() => set(value - 1)}
            disabled={value <= DEPENDENTS_MIN}
            aria-label="Decrease dependents"
          >
            <FaMinus aria-hidden />
          </button>
          <input
            id={name}
            type="number"
            inputMode="numeric"
            min={DEPENDENTS_MIN}
            max={DEPENDENTS_MAX}
            className="num-stepper-input"
            {...register(name, {
              valueAsNumber: true,
              min: DEPENDENTS_MIN,
              max: DEPENDENTS_MAX,
            })}
            onBlur={(e) => {
              // Coerce direct-typed input into the bounded range on blur so
              // out-of-range values don't sneak past the +/- buttons.
              set(Number(e.target.value));
            }}
          />
          <button
            type="button"
            className="num-stepper-btn"
            onClick={() => set(value + 1)}
            disabled={value >= DEPENDENTS_MAX}
            aria-label="Increase dependents"
          >
            <FaPlus aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function clampDependents(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEPENDENTS_MIN;
  return Math.max(DEPENDENTS_MIN, Math.min(DEPENDENTS_MAX, Math.floor(n)));
}

export default PersonalInfoField;
