import React from "react";
import "../styles/PopupOverlay.css";

/**
 * Reusable popup overlay component
 * Used for both renewal and termination detail popups
 */
const PopupOverlay = ({ show, onClose, children, className = "" }) => {
    if (!show) return null;

    return (
        <>
            <div className="overlay" onClick={onClose}></div>
            <div className={`popup ${className}`}>
                <span className="close-btn" onClick={onClose}>
                    ×
                </span>
                {children}
            </div>
        </>
    );
};

export default PopupOverlay;