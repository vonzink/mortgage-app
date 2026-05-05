// Wires Testing Library's custom Jest matchers (toHaveAttribute, toBeDisabled,
// toBeInTheDocument, etc.). The package is already in dependencies — this file
// is the CRA hook that activates it for every test file automatically.
import '@testing-library/jest-dom';
