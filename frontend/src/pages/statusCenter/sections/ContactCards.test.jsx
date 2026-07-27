import React from 'react';
import { render, screen } from '@testing-library/react';
import ContactCards from './ContactCards';

const CONTACTS = [
  // v2.1: the borrower's own team leads the server-sent order (Processor + Loan Assistant),
  // then the third parties. Icons come from ROLE_ICONS — the two team roles must map to their
  // own glyphs, not the '☎' fallback.
  { role: 'PROCESSOR', roleLabel: 'Processor', name: 'Pam Process', company: 'MSFG', phone: '(303) 555-0110', email: 'pam@msfg.example.com' },
  { role: 'LOAN_ASSISTANT', roleLabel: 'Loan Assistant', name: 'Lee Assist', company: 'MSFG', phone: '(303) 555-0120', email: 'lee@msfg.example.com' },
  { role: 'TITLE_COMPANY', roleLabel: 'Title', name: 'Terri Cruz', company: 'Alta Title Co.', phone: '(303) 555-0140', email: 'terri@altatitle.example.com' },
  { role: 'INSURANCE_AGENT', roleLabel: 'Insurance', name: 'Ian Shore', company: 'Acme Insurance', phone: '(303) 555-0177', email: 'ian@acmeins.example.com' },
];

describe('ContactCards (single "Your loan team" card, v2.1)', () => {
  test('renders ONE card with the team heading and a row group per contact, in server order', () => {
    const { container } = render(<ContactCards contacts={CONTACTS} />);
    expect(container.querySelectorAll('.lsc-card')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Your loan team' })).toBeInTheDocument();
    expect(container.querySelectorAll('.lsc-contact-row')).toHaveLength(4);
    // per-contact roleLabel eyebrows, server order preserved (team roles first)
    const eyebrows = [...container.querySelectorAll('.lsc-contact-eyebrow')].map((el) => el.textContent);
    expect(eyebrows[0]).toContain('Processor');
    expect(eyebrows[1]).toContain('Loan Assistant');
    expect(eyebrows[2]).toContain('Title');
    expect(eyebrows[3]).toContain('Insurance');
    // the two v2.1 team roles resolve to their OWN icons (not the '☎' fallback)
    const icons = [...container.querySelectorAll('.lsc-contact-eyebrow-ic')].map((el) => el.textContent);
    expect(icons[0]).toBe('⚙');
    expect(icons[1]).toBe('✎');
    expect(screen.getByText('Pam Process')).toBeInTheDocument();
    expect(screen.getByText('Lee Assist')).toBeInTheDocument();
    expect(screen.getByText('Terri Cruz')).toBeInTheDocument();
    expect(screen.getByText('Alta Title Co.')).toBeInTheDocument();
    expect(screen.getByText('Ian Shore')).toBeInTheDocument();
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument();
  });

  test('roleLabel is an eyebrow, not a card heading', () => {
    render(<ContactCards contacts={CONTACTS} />);
    expect(screen.queryByRole('heading', { name: 'Title' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Insurance' })).toBeNull();
  });

  test('phone renders a tel: link and email a mailto: link', () => {
    render(<ContactCards contacts={[CONTACTS[2]]} />);
    expect(screen.getByRole('link', { name: /555-0140/ }))
      .toHaveAttribute('href', 'tel:(303) 555-0140');
    expect(screen.getByRole('link', { name: /terri@altatitle\.example\.com/ }))
      .toHaveAttribute('href', 'mailto:terri@altatitle.example.com');
  });

  test('blank fields hide their rows (name-only contact keeps its row group)', () => {
    render(
      <ContactCards contacts={[{ role: 'ESCROW_OFFICER', roleLabel: 'Escrow', name: 'Eve Osei', company: '', phone: null, email: '' }]} />,
    );
    expect(screen.getByText('Escrow')).toBeInTheDocument();
    expect(screen.getByText('Eve Osei')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('a contact with every display field blank is skipped entirely', () => {
    const { container } = render(
      <ContactCards
        contacts={[
          CONTACTS[0],
          { role: 'LISTING_AGENT', roleLabel: "Seller's Agent", name: '', company: null, phone: '', email: null },
        ]}
      />,
    );
    expect(container.querySelectorAll('.lsc-contact-row')).toHaveLength(1);
    expect(screen.queryByText("Seller's Agent")).not.toBeInTheDocument();
  });

  test('blank roleLabel falls back to the raw role in the eyebrow', () => {
    const { container } = render(
      <ContactCards contacts={[{ role: 'SELLING_AGENT', roleLabel: null, name: 'Bud Byer', company: null, phone: null, email: null }]} />,
    );
    expect(container.querySelector('.lsc-contact-eyebrow')).toHaveTextContent('SELLING_AGENT');
  });

  test('renders nothing for null, empty, non-array, or all-blank contacts', () => {
    const a = render(<ContactCards contacts={null} />);
    expect(a.container.firstChild).toBeNull();
    const b = render(<ContactCards contacts={[]} />);
    expect(b.container.firstChild).toBeNull();
    const c = render(<ContactCards contacts="oops" />);
    expect(c.container.firstChild).toBeNull();
    const d = render(
      <ContactCards contacts={[{ role: 'TITLE_COMPANY', roleLabel: 'Title', name: '', company: '', phone: '', email: null }]} />,
    );
    expect(d.container.firstChild).toBeNull();
  });
});
