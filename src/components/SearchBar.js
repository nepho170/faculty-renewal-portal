import React from "react";
import "../styles/SearchBar.css"; // Make sure this file exists in the same directory

/**
 * Reusable search component for filtering faculty lists
 */
const SearchBar = ({
    searchTerm,
    setSearchTerm,
    placeholder = "Search by Name or ID...",
    onClear = null
}) => {
    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleClear = () => {
        setSearchTerm("");
        if (onClear) onClear();
    };

    return (
        <div className="search-container">
            <span className="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </span>
            <input
                type="text"
                id="searchInput"
                placeholder={placeholder}
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
            />
            {searchTerm && (
                <button
                    className="clear-button"
                    onClick={handleClear}
                    aria-label="Clear search"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            )}
        </div>
    );
};

export default SearchBar;