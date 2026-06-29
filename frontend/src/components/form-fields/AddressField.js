/**
 * Address Field Component
 * Reusable address input component
 */
import React, { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '../../utils/googleMaps';

const AddressField = ({
  register,
  errors,
  prefix = '',
  required = false,
  showCounty = false,
  label = 'Address',
  enableAutocomplete = false,
  setValue
}) => {
  const getFieldName = (field) => prefix ? `${prefix}.${field}` : field;
  const getError = (field) => prefix ? errors[prefix]?.[field] : errors[field];

  // Keep the addressLine DOM node so we can attach Google Places Autocomplete.
  // register() also needs this node, so we merge our ref with RHF's ref below.
  const addressLineRef = useRef(null);
  // RHF's register() returns its own ref callback; capture it to forward.
  const addressLineReg = register(getFieldName('addressLine'), {
    required: required ? `${label} is required` : false
  });

  useEffect(() => {
    // Opt-in only, and only when RHF setValue is available to write the parsed
    // components back into the form. Any missing precondition => plain input.
    if (!enableAutocomplete || typeof setValue !== 'function') {
      return undefined;
    }

    let autocomplete = null;
    let listener = null;
    let cancelled = false;

    loadGoogleMaps().then((maps) => {
      // No key (maps === null), unmounted, or input gone => degrade silently.
      if (cancelled || !maps || !maps.places || !addressLineRef.current) {
        return;
      }

      autocomplete = new maps.places.Autocomplete(addressLineRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      });

      listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place || !place.address_components) {
          return;
        }

        const get = (type, useShort = false) => {
          const comp = place.address_components.find((c) =>
            c.types.includes(type)
          );
          if (!comp) return '';
          return useShort ? comp.short_name : comp.long_name;
        };

        const streetNumber = get('street_number');
        const route = get('route');
        const addressLine = [streetNumber, route].filter(Boolean).join(' ');
        const city =
          get('locality') ||
          get('sublocality') ||
          get('sublocality_level_1') ||
          get('postal_town');
        // administrative_area_level_1 short_name is the 2-letter USPS code the
        // <select> expects (e.g. "CA"), matching the option values directly.
        const state = get('administrative_area_level_1', true);
        const zipCode = get('postal_code');

        const opts = { shouldDirty: true };
        if (addressLine) setValue(getFieldName('addressLine'), addressLine, opts);
        if (city) setValue(getFieldName('city'), city, opts);
        if (state) setValue(getFieldName('state'), state, opts);
        if (zipCode) setValue(getFieldName('zipCode'), zipCode, opts);
      });
    });

    return () => {
      cancelled = true;
      // Detach the place_changed listener on unmount / dependency change.
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      } else if (
        autocomplete &&
        window.google &&
        window.google.maps &&
        window.google.maps.event
      ) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
    // prefix change re-binds field names; setValue/enableAutocomplete are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableAutocomplete, prefix]);

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
            {...addressLineReg}
            ref={(el) => {
              // Forward the node to both RHF and our Autocomplete ref.
              addressLineReg.ref(el);
              addressLineRef.current = el;
            }}
            placeholder="123 Main Street"
            className={getError('addressLine') ? 'error' : ''}
          />
          {getError('addressLine') && (
            <span className="error-message" role="alert">{getError('addressLine').message}</span>
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
            <span className="error-message" role="alert">{getError('city').message}</span>
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
            <span className="error-message" role="alert">{getError('state').message}</span>
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
            <span className="error-message" role="alert">{getError('zipCode').message}</span>
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
