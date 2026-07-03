import React from 'react';
import { render, screen } from '@testing-library/react';
import LoanOfficerCard from './LoanOfficerCard';

const LO = {
  name: 'Zachary Zink',
  title: 'Senior Loan Officer',
  nmls: '1284467',
  phone: '(720) 555-0184',
  email: 'zachary.zink@msfg.us',
};

describe('LoanOfficerCard', () => {
  test('avatar shows initials from the name', () => {
    render(<LoanOfficerCard loanOfficer={LO} />);
    expect(screen.getByText('ZZ')).toBeInTheDocument();
    expect(screen.getByText('Zachary Zink')).toBeInTheDocument();
  });

  test('phone renders a tel: link and email a mailto: link', () => {
    render(<LoanOfficerCard loanOfficer={LO} />);
    const tel = screen.getByRole('link', { name: /555-0184/ });
    expect(tel).toHaveAttribute('href', 'tel:(720) 555-0184');
    const mail = screen.getByRole('link', { name: /zachary\.zink@msfg\.us/ });
    expect(mail).toHaveAttribute('href', 'mailto:zachary.zink@msfg.us');
  });

  test('title and NMLS render in the sub-line', () => {
    render(<LoanOfficerCard loanOfficer={LO} />);
    expect(screen.getByText(/Senior Loan Officer/)).toBeInTheDocument();
    expect(screen.getByText(/NMLS #1284467/)).toBeInTheDocument();
  });

  test('empty rows are hidden', () => {
    render(<LoanOfficerCard loanOfficer={{ name: 'Zachary Zink', title: '', nmls: null, phone: '', email: null }} />);
    expect(screen.getByText('Zachary Zink')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText(/NMLS/)).not.toBeInTheDocument();
  });

  test('blank name falls back to a neutral placeholder (avatar + name line)', () => {
    const { container } = render(
      <LoanOfficerCard loanOfficer={{ name: '', title: null, nmls: null, phone: null, email: null }} />,
    );
    // card still renders (container decides visibility); avatar shows a neutral glyph
    expect(container.querySelector('.lsc-card')).not.toBeNull();
    expect(container.querySelector('.lsc-lo-ph').textContent).toBe('—');
    expect(screen.getByText('Your loan team')).toBeInTheDocument();
  });

  test('renders nothing when loanOfficer is null', () => {
    const { container } = render(<LoanOfficerCard loanOfficer={null} />);
    expect(container.querySelector('.lsc-card')).toBeNull();
  });
});
