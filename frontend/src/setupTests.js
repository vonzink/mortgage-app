// Wires Testing Library's custom Jest matchers (toHaveAttribute, toBeDisabled,
// toBeInTheDocument, etc.). The package is already in dependencies — this file
// is the CRA hook that activates it for every test file automatically.
import '@testing-library/jest-dom';

// jsdom (the jest test DOM) does not provide TextEncoder/TextDecoder, which the
// AWS SDK v3 (@aws-sdk/client-cognito-identity-provider, transitively via @smithy)
// loads at import time. Browsers DO have these globals, so this polyfill is
// TEST-INFRA ONLY — it does not touch app/runtime code. Required so any suite that
// imports the real CognitoOtpAdapter graph can load.
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
