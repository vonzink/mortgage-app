import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import PersonalInfoField from './PersonalInfoField';

// Minimal RHF harness. prefix='' keeps field/error keys flat (errors.ssn) so the
// component's getError() resolves the message. `required` drives the name/email/phone
// rules; `ssnRequired` INDEPENDENTLY drives the SSN rule — SSN is decoupled and optional
// by default (per product), even for the primary borrower where required={true}.
function Harness({ required, ssnRequired }) {
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
        ssnRequired={ssnRequired}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe('PersonalInfoField — SSN is decoupled from `required` (SSN optional)', () => {
  test('SSN is NOT required even when required=true (primary borrower), since ssnRequired defaults false', async () => {
    render(<Harness required={true} />);
    fireEvent.click(screen.getByText('Submit'));
    await screen.findByText('Submit'); // let react-hook-form's async validation settle
    expect(screen.queryByText('SSN is required')).not.toBeInTheDocument();
  });

  test('SSN can still be required via the explicit ssnRequired flag', async () => {
    render(<Harness required={false} ssnRequired={true} />);
    fireEvent.click(screen.getByText('Submit'));
    expect(await screen.findByText('SSN is required')).toBeInTheDocument();
  });

  test('SSN is not required when neither flag is set', async () => {
    render(<Harness required={false} />);
    fireEvent.click(screen.getByText('Submit'));
    await screen.findByText('Submit');
    expect(screen.queryByText('SSN is required')).not.toBeInTheDocument();
  });
});
