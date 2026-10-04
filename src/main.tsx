import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useStore } from './store';
import { loadBook } from './lib/persist';
import { applyTheme } from './theme';
import './styles/base.css';
import './styles/book.css';
import './styles/elements.css';
import './styles/editor.css';

const root = createRoot(document.getElementById('root')!);

loadBook().then(({ book }) => {
  useStore.setState({ book });
  applyTheme(book.theme);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
