import React, { useState, useEffect } from 'react';
import './PopupStyles.css';

const SeeResult = ({ onClose, onViewResult, setSelectedHazards }) => {
  const [progress, setProgress] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Animate progress bar over 3 seconds
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setShowButton(true); // Show button when progress completes
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="processing-popup-overlay">
      <div className="processing-popup">
        <div className="processing-content">
          <div className="processing-message">
            Processing Hazard Assessment, Please wait...
          </div>

          <div className="progress-container">
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {showButton && (
            <div className="button-row">
              <button className="cancel-button" onClick={onClose}>
                Cancel
              </button>

              <button
                className="processing-button"
                onClick={() => {
                  const all = ['Flooding', 'Rainfall', 'Heat Index'];
                  setSelectedHazards(all);
                  onClose();
                  onViewResult();
                }}
              >
                See Result
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeeResult;
