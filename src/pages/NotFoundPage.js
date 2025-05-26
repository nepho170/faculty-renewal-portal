import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/NotFoundPage.css';

const NotFoundPage = () => {
  const { currentUser } = useAuth();

  // Determine redirect path based on user role
  const getRedirectPath = () => {
    if (!currentUser) return '/login';

    switch (currentUser.role) {
      case 'Faculty':
        return '/faculty';
      case 'Department Chair':
        return '/login';
      case 'Dean':
        return '/dean';
      case 'Provost':
        return '/provost';
      case 'HR':
        return '/hr';
      default:
        return '/login';
    }
  };

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>Sorry, the page you are looking for doesn't exist or has been moved.</p>
        <Link to={getRedirectPath()} className="back-button">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;