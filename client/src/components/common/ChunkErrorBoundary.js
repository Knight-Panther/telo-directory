import React from "react";

class ChunkErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Check if it's a chunk loading error
        if (error?.name === 'ChunkLoadError' || 
            error?.message?.includes('Loading chunk') ||
            error?.message?.includes('ChunkLoadError')) {
            return { hasError: true, error };
        }
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log chunk loading errors
        console.error('Chunk loading error:', error, errorInfo);
        
        // Check if it's a chunk loading error and retry
        if (error?.name === 'ChunkLoadError' || 
            error?.message?.includes('Loading chunk')) {
            // Suggest page refresh for chunk loading errors
            this.setState({ hasError: true, isChunkError: true });
        }
    }

    handleRetry = () => {
        if (this.state.isChunkError) {
            // For chunk errors, refresh the page
            window.location.reload();
        } else {
            // For other errors, just reset state
            this.setState({ hasError: false, error: null, isChunkError: false });
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '50vh',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>
                        {this.state.isChunkError ? 'Loading Error' : 'Something went wrong'}
                    </h2>
                    <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: '500px' }}>
                        {this.state.isChunkError 
                            ? 'There was an issue loading this page. This might be due to a recent update.'
                            : 'An unexpected error occurred. Please try again.'
                        }
                    </p>
                    <button 
                        onClick={this.handleRetry}
                        style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#2563eb'}
                        onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                    >
                        {this.state.isChunkError ? 'Refresh Page' : 'Try Again'}
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ChunkErrorBoundary;