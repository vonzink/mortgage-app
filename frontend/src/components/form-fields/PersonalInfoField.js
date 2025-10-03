/**
 * Personal Information Field Component
 * Reusable personal information input component
 */
import React from 'react';

const PersonalInfoField = ({ 
  register, 
  errors, 
  prefix = '', 
  required = false,
  label = 'Personal Information'
}) => {
  const getFieldName = (field) => prefix ? `${prefix}.${field}` : field;
  const getError = (field) => prefix ? errors[prefix]?.[field] : errors[field];

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
            <span className="error-message">{getError('firstName').message}</span>
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
            <span className="error-message">{getError('lastName').message}</span>
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
            Social Security Number {required && '*'}
          </label>
          <input
            type="text"
            id={getFieldName('ssn')}
            {...register(getFieldName('ssn'), { 
              required: required ? 'SSN is required' : false,
              pattern: {
                value: /^\d{3}-?\d{2}-?\d{4}$/,
                message: 'Invalid SSN format'
              }
            })}
            placeholder="123-45-6789"
            className={getError('ssn') ? 'error' : ''}
          />
          {getError('ssn') && (
            <span className="error-message">{getError('ssn').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('dateOfBirth')}>
            Date of Birth {required && '*'}
          </label>
          <input
            type="date"
            id={getFieldName('dateOfBirth')}
            {...register(getFieldName('dateOfBirth'), { 
              required: required ? 'Date of birth is required' : false 
            })}
            className={getError('dateOfBirth') ? 'error' : ''}
          />
          {getError('dateOfBirth') && (
            <span className="error-message">{getError('dateOfBirth').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('maritalStatus')}>
            Marital Status {required && '*'}
          </label>
          <select
            id={getFieldName('maritalStatus')}
            {...register(getFieldName('maritalStatus'), { 
              required: required ? 'Marital status is required' : false 
            })}
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
            <span className="error-message">{getError('maritalStatus').message}</span>
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

        <div className="form-group">
          <label htmlFor={getFieldName('citizenshipType')}>
            Citizenship Type {required && '*'}
          </label>
          <select
            id={getFieldName('citizenshipType')}
            {...register(getFieldName('citizenshipType'), { 
              required: required ? 'Citizenship type is required' : false 
            })}
            className={getError('citizenshipType') ? 'error' : ''}
          >
            <option value="">Select Type</option>
            <option value="USCitizen">US Citizen</option>
            <option value="PermanentResident">Permanent Resident</option>
            <option value="NonResidentAlien">Non-Resident Alien</option>
            <option value="Other">Other</option>
          </select>
          {getError('citizenshipType') && (
            <span className="error-message">{getError('citizenshipType').message}</span>
          )}
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
            <span className="error-message">{getError('email').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('phone')}>
            Phone Number {required && '*'}
          </label>
          <input
            type="tel"
            id={getFieldName('phone')}
            {...register(getFieldName('phone'), { 
              required: required ? 'Phone number is required' : false,
              pattern: {
                value: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
                message: 'Invalid phone number format'
              }
            })}
            placeholder="(555) 123-4567"
            className={getError('phone') ? 'error' : ''}
          />
          {getError('phone') && (
            <span className="error-message">{getError('phone').message}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoField;
