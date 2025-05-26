import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LogoutButton.css';

const LogoutButton = ({ className = '' }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("Logging out user");
    logout();
    navigate('/login');
  };

  return (
    <button 
      className={`logout-btn ${className}`} 
      onClick={handleLogout}
    >
      Logout
    </button>
  );
};

export default LogoutButton;