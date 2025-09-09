import React, { useState } from 'react';
import userAuthService from '../../services/userAuthService';
import './EmailChangeModal.css';

const EmailChangeModal = ({ isOpen, onClose, onEmailChange, currentEmail }) => {
    const [step, setStep] = useState(1); // 1: enter email, 2: enter code
    const [newEmail, setNewEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const resetModal = () => {
        setStep(1);
        setNewEmail('');
        setVerificationCode('');
        setError('');
        setSuccess('');
        setLoading(false);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        if (!newEmail || newEmail === currentEmail) {
            setError('Please enter a different email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await userAuthService.userAPI.post('/auth/change-email', {
                newEmail
            });

            setStep(2);
            setSuccess('Verification code sent to your current email!');
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to send verification code';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await userAuthService.userAPI.post('/auth/change-email', {
                verificationCode
            });

            setSuccess('Email changed successfully!');
            setTimeout(() => {
                onEmailChange(response.data.newEmail);
                handleClose();
            }, 1500);
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Invalid verification code';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Change Email Address</h3>
                    <button className="modal-close" onClick={handleClose}>×</button>
                </div>

                <div className="modal-body">
                    {step === 1 && (
                        <form onSubmit={handleSendCode}>
                            <div className="form-group">
                                <label>Current Email</label>
                                <input 
                                    type="email" 
                                    value={currentEmail} 
                                    disabled 
                                    className="form-control disabled"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>New Email Address</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="form-control"
                                    placeholder="Enter new email address"
                                    required
                                />
                            </div>

                            <p className="info-text">
                                A 6-digit verification code will be sent to your <strong>current</strong> email address for security.
                            </p>

                            {error && <div className="error-message">{error}</div>}

                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={loading || !newEmail}
                            >
                                {loading ? 'Sending...' : 'Send Verification Code'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyCode}>
                            <div className="step-info">
                                <p>We sent a 6-digit code to:</p>
                                <p className="email-highlight">{currentEmail}</p>
                                <p>Enter the code below to complete the change to:</p>
                                <p className="email-highlight">{newEmail}</p>
                            </div>

                            <div className="form-group">
                                <label>Verification Code</label>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="form-control code-input"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <p className="info-text">
                                Code expires in 10 minutes
                            </p>

                            {error && <div className="error-message">{error}</div>}
                            {success && <div className="success-message">{success}</div>}

                            <div className="button-group">
                                <button 
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setStep(1)}
                                    disabled={loading}
                                >
                                    Back
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary"
                                    disabled={loading || verificationCode.length !== 6}
                                >
                                    {loading ? 'Verifying...' : 'Verify Code'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailChangeModal;