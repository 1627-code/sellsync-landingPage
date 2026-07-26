import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-[2rem] border border-red-100 shadow-xl shadow-red-50/50">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 max-w-md mb-8">
            An unexpected error occurred while rendering this section. Our team has been notified.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="h-12 px-6 rounded-xl border-gray-200 font-bold"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
            <Button 
              className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold"
              onClick={() => this.setState({ hasError: false })}
            >
              Try Again
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 p-4 bg-gray-50 rounded-xl text-left w-full max-w-2xl overflow-auto border border-gray-100">
              <p className="text-xs font-mono text-red-600">{this.state.error?.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
