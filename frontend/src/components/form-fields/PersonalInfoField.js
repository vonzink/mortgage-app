/**
 * Personal Information Field Component
 * Reusable personal information input component
 */
import React from 'react';
import { formatSSN, formatPhone } from '../../utils/formHelpers';

const PersonalInfoField = ({
  register,
  errors,
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

      <div className="form-row">
        <div className="form-group">
          <label htmlFor={getFieldName('dependents')}>
            Number of Dependents
          </label>
          <input
            type="number"
            id={getFieldName('dependents')}
            {...register(getFieldName('dependents'))}
            placeholder="0"
            min="0"
          />
        </div>
      </div>

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

export default PersonalInfoField;
