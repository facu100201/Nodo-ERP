import { render } from '@testing-library/react';

// Stub AuthContext so tests don't need a running backend
jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ token: null, loading: false }),
}));

import App from './App';

test('renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeTruthy();
});
