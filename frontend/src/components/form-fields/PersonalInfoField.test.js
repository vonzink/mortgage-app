import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import PersonalInfoField from './PersonalInfoField';

// Minimal RHF harness. prefix='' keeps field/error keys flat (errors.ssn) so the
// component's getError() resolves the message — we are testing the SSN required
// RULE, independent of nested-prefix wiring.
function Harness({ required }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();
  return (
    <form onSubmit={handleSubmit(() => {})}>
      <PersonalInfoField
        register={register}
        errors={errors}
        setValue={setValue}
        watch={watch}
        prefix=""
        required={required}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('PersonalInfoField — SSN required (QA #5)', () => {
  test('shows "SSN is required" on submit when required and empty', async () => {
    render(<Harness required={true} />);
    fireEvent.click(screen.getByText('Submit'));
    expect(await screen.findByText('SSN is required')).toBeInTheDocument();
  });

  test('does not require SSN when required is false', async () => {
    render(<Harness required={false} />);
    fireEvent.click(screen.getByText('Submit'));
    // let react-hook-form's async validation settle
    await screen.findByText('Submit');
    expect(screen.queryByText('SSN is required')).not.toBeInTheDocument();
  });
});
