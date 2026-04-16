import React, { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export const ErrorBoundary: React.FC<Props> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    let message = "Something went wrong.";
    try {
      const parsed = JSON.parse(error?.message || "");
      if (parsed.error && parsed.operationType) {
        message = `Firestore ${parsed.operationType} failed: ${parsed.error}`;
      }
    } catch (e) {
      message = error?.message || message;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4">
        <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">Application Error</h2>
          <p className="text-gray-500 mb-6 text-sm">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-[#F27D26] text-black rounded-xl font-bold hover:bg-[#ff8c3a] transition-colors uppercase tracking-widest text-xs"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

