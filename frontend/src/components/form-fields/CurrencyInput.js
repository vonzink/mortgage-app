import React, { useState, useEffect } from 'react';

/**
 * Currency Input Component
 * Formats input values as currency with $ symbol, commas, and cents
 */
const CurrencyInput = ({ 
  id, 
  name, 
  value, 
  onChange, 
  onBlur,
  placeholder = '0.00',
  className = '',
  disabled = false,
  min = 0,
  ...rest 
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format the value for display
  const formatDisplay = (val) => {
    if (!val && val !== 0) return '';
    
    // Remove non-numeric characters except decimal point
    const cleaned = val.toString().replace(/[^0-9.]/g, '');
    
    // Parse to number
    const number = parseFloat(cleaned);
    if (isNaN(number)) return '';
    
    // When focused, show without formatting for easier editing
    if (isFocused) {
      return cleaned;
    }
    
    // When not focused, show formatted with commas and cents
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Update display value when prop value changes
  useEffect(() => {
    setDisplayValue(formatDisplay(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFocused]);

  const handleFocus = (e) => {
    setIsFocused(true);
    // Remove formatting for easier editing
    const cleaned = e.target.value.replace(/[^0-9.]/g, '');
    setDisplayValue(cleaned);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    const cleaned = e.target.value.replace(/[^0-9.]/g, '');
    const number = parseFloat(cleaned) || 0;
    
    // Format the value
    const formatted = formatDisplay(number);
    setDisplayValue(formatted);
    
    // Call onChange with the numeric value
    if (onChange) {
      onChange({
        target: {
          name: name || id,
          value: number
        }
      });
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleChange = (e) => {
    const input = e.target.value;
    
    // Allow only numbers and one decimal point
    const cleaned = input.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    let validValue = parts[0];
    if (parts.length > 1) {
      validValue += '.' + parts.slice(1).join('').substring(0, 2);
    }
    
    setDisplayValue(validValue);
    
    // Call onChange with numeric value
    if (onChange) {
      const number = parseFloat(validValue) || 0;
      onChange({
        target: {
          name: name || id,
          value: number
        }
      });
    }
  };

  return (
    <div className="currency-input-wrapper" style={{ position: 'relative' }}>
      <span 
        className="currency-symbol" 
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-secondary)',
          pointerEvents: 'none',
          fontSize: '1rem',
          fontWeight: '500'
        }}
      >
        $
      </span>
      <input
        type="text"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        style={{
          paddingLeft: '28px'
        }}
        {...rest}
      />
    </div>
  );
};

export default CurrencyInput;

