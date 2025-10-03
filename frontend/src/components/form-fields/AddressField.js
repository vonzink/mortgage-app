/**
 * Address Field Component
 * Reusable address input component
 */
import React from 'react';

const AddressField = ({ 
  register, 
  errors, 
  prefix = '', 
  required = false,
  showCounty = false,
  label = 'Address'
}) => {
  const getFieldName = (field) => prefix ? `${prefix}.${field}` : field;
  const getError = (field) => prefix ? errors[prefix]?.[field] : errors[field];

  return (
    <div className="address-fields">
      <div className="form-row">
        <div className="form-group full-width">
          <label htmlFor={getFieldName('addressLine')}>
            {label} {required && '*'}
          </label>
          <input
            type="text"
            id={getFieldName('addressLine')}
            {...register(getFieldName('addressLine'), { 
              required: required ? `${label} is required` : false 
            })}
            placeholder="123 Main Street"
            className={getError('addressLine') ? 'error' : ''}
          />
          {getError('addressLine') && (
            <span className="error-message">{getError('addressLine').message}</span>
          )}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor={getFieldName('city')}>
            City {required && '*'}
          </label>
          <input
            type="text"
            id={getFieldName('city')}
            {...register(getFieldName('city'), { 
              required: required ? 'City is required' : false 
            })}
            placeholder="Los Angeles"
            className={getError('city') ? 'error' : ''}
          />
          {getError('city') && (
            <span className="error-message">{getError('city').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('state')}>
            State {required && '*'}
          </label>
          <select
            id={getFieldName('state')}
            {...register(getFieldName('state'), { 
              required: required ? 'State is required' : false 
            })}
            className={getError('state') ? 'error' : ''}
          >
            <option value="">Select State</option>
            <option value="AL">Alabama</option>
            <option value="AK">Alaska</option>
            <option value="AZ">Arizona</option>
            <option value="AR">Arkansas</option>
            <option value="CA">California</option>
            <option value="CO">Colorado</option>
            <option value="CT">Connecticut</option>
            <option value="DE">Delaware</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="HI">Hawaii</option>
            <option value="ID">Idaho</option>
            <option value="IL">Illinois</option>
            <option value="IN">Indiana</option>
            <option value="IA">Iowa</option>
            <option value="KS">Kansas</option>
            <option value="KY">Kentucky</option>
            <option value="LA">Louisiana</option>
            <option value="ME">Maine</option>
            <option value="MD">Maryland</option>
            <option value="MA">Massachusetts</option>
            <option value="MI">Michigan</option>
            <option value="MN">Minnesota</option>
            <option value="MS">Mississippi</option>
            <option value="MO">Missouri</option>
            <option value="MT">Montana</option>
            <option value="NE">Nebraska</option>
            <option value="NV">Nevada</option>
            <option value="NH">New Hampshire</option>
            <option value="NJ">New Jersey</option>
            <option value="NM">New Mexico</option>
            <option value="NY">New York</option>
            <option value="NC">North Carolina</option>
            <option value="ND">North Dakota</option>
            <option value="OH">Ohio</option>
            <option value="OK">Oklahoma</option>
            <option value="OR">Oregon</option>
            <option value="PA">Pennsylvania</option>
            <option value="RI">Rhode Island</option>
            <option value="SC">South Carolina</option>
            <option value="SD">South Dakota</option>
            <option value="TN">Tennessee</option>
            <option value="TX">Texas</option>
            <option value="UT">Utah</option>
            <option value="VT">Vermont</option>
            <option value="VA">Virginia</option>
            <option value="WA">Washington</option>
            <option value="WV">West Virginia</option>
            <option value="WI">Wisconsin</option>
            <option value="WY">Wyoming</option>
          </select>
          {getError('state') && (
            <span className="error-message">{getError('state').message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor={getFieldName('zipCode')}>
            ZIP Code {required && '*'}
          </label>
          <input
            type="text"
            id={getFieldName('zipCode')}
            {...register(getFieldName('zipCode'), { 
              required: required ? 'ZIP code is required' : false,
              pattern: {
                value: /^\d{5}(-\d{4})?$/,
                message: 'Invalid ZIP code format'
              }
            })}
            placeholder="90210"
            className={getError('zipCode') ? 'error' : ''}
          />
          {getError('zipCode') && (
            <span className="error-message">{getError('zipCode').message}</span>
          )}
        </div>
      </div>

      {showCounty && (
        <div className="form-row">
          <div className="form-group">
            <label htmlFor={getFieldName('county')}>
              County
            </label>
            <input
              type="text"
              id={getFieldName('county')}
              {...register(getFieldName('county'))}
              placeholder="Los Angeles"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressField;
