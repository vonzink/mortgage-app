import React from 'react';
import { render, screen } from '@testing-library/react';
import ContactCards from './ContactCards';

const CONTACTS = [
  { role: 'TITLE_COMPANY', roleLabel: 'Title', name: 'Terri Cruz', company: 'Alta Title Co.', phone: '(303) 555-0140', email: 'terri@altatitle.example.com' },
  { role: 'INSURANCE_AGENT', roleLabel: 'Insurance', name: 'Ian Shore', company: 'Acme Insurance', phone: '(303) 555-0177', email: 'ian@acmeins.example.com' },
];

describe('ContactCards', () => {
  test('renders one card per contact: roleLabel heading, name, company', () => {
    const { container } = render(<ContactCards contacts={CONTACTS} />);
    expect(container.querySelectorAll('.lsc-card')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Insurance' })).toBeInTheDocument();
    expect(screen.getByText('Terri Cruz')).toBeInTheDocument();
    expect(screen.getByText('Alta Title Co.')).toBeInTheDocument();
    expect(screen.getByText('Ian Shore')).toBeInTheDocument();
    expect(screen.getByText('Acme Insurance')).toBeInTheDocument();
  });

  test('phone renders a tel: link and email a mailto: link', () => {
    render(<ContactCards contacts={[CONTACTS[0]]} />);
    expect(screen.getByRole('link', { name: /555-0140/ }))
      .toHaveAttribute('href', 'tel:(303) 555-0140');
    expect(screen.getByRole('link', { name: /terri@altatitle\.example\.com/ }))
      .toHaveAttribute('href', 'mailto:terri@altatitle.example.com');
  });

  test('blank fields hide their rows (name-only contact still renders its card)', () => {
    render(
      <ContactCards contacts={[{ role: 'ESCROW_OFFICER', roleLabel: 'Escrow', name: 'Eve Osei', company: '', phone: null, email: '' }]} />,
    );
    expect(screen.getByRole('heading', { name: 'Escrow' })).toBeInTheDocument();
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
    expect(container.querySelectorAll('.lsc-card')).toHaveLength(1);
    expect(screen.queryByText("Seller's Agent")).not.toBeInTheDocument();
  });

  test('blank roleLabel falls back to the raw role', () => {
    render(
      <ContactCards contacts={[{ role: 'SELLING_AGENT', roleLabel: null, name: 'Bud Byer', company: null, phone: null, email: null }]} />,
    );
    expect(screen.getByRole('heading', { name: 'SELLING_AGENT' })).toBeInTheDocument();
  });

  test('renders nothing for null, empty, or non-array contacts', () => {
    const a = render(<ContactCards contacts={null} />);
    expect(a.container.firstChild).toBeNull();
    const b = render(<ContactCards contacts={[]} />);
    expect(b.container.firstChild).toBeNull();
    const c = render(<ContactCards contacts="oops" />);
    expect(c.container.firstChild).toBeNull();
  });
});
