import { Route, Routes } from 'react-router-dom';
import SearchPage from './pages/SearchPage.jsx';
import UploadPage from './pages/UploadPage.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">₱</span> Store Pricing Hub
        </div>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/prices" element={<SearchPage />} />
          <Route path="*" element={<UploadPage />} />
        </Routes>
      </main>
    </div>
  );
}
