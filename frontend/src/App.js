import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Header from './components/Header';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationList from './pages/ApplicationList';
import ApplicationDetails from './pages/ApplicationDetails';

// Styles
import './App.css';

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ApplicationForm />} />
            <Route path="/apply" element={<ApplicationForm />} />
            <Route path="/applications" element={<ApplicationList />} />
            <Route path="/applications/:id" element={<ApplicationDetails />} />
          </Routes>
        </main>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </Router>
  );
}

export default App;
