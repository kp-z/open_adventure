import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ModeProvider } from './contexts/ModeContext';
import '../styles/theme.css';
import '../styles/fonts.css';

export default function App() {
  return (
    <React.StrictMode>
      <ModeProvider>
        <RouterProvider router={router} />
      </ModeProvider>
    </React.StrictMode>
  );
}
