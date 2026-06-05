import React, { Component, ErrorInfo, ReactNode } from "react";
import { logEvent } from "firebase/analytics";
import { analytics } from "@/lib/firebase/client";
import TranslatedText from "@/components/ui/TranslatedText";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ErrorBoundary:${this.props.componentName}]`,
      error,
      errorInfo,
    );
    // Log to Firebase Analytics
    try {
      if (analytics) {
        logEvent(analytics, "component_error", {
          component: this.props.componentName,
          error_message: error.message,
          error_stack: error.stack,
        });
      }
    } catch {
      // Analytics must never crash the app
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            aria-live="assertive"
            className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl border border-red-800 text-center"
          >
            <span className="text-4xl mb-4">⚠️</span>
            <h2 className="text-white font-bold text-lg mb-2">
              {/* Localized string */}
              <TranslatedText text="Something went wrong" />
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {/* Display raw error message if available, otherwise localized fallback */}
              {this.state.error?.message ?? (
                <TranslatedText text="An unexpected error occurred" />
              )}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              // Removed the hardcoded English aria-label so screen readers
              // will automatically read the translated inner text instead.
            >
              {/* Localized string */}
              <TranslatedText text="Try Again" />
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
