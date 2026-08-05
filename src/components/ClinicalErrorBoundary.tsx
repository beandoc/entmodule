'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ClinicalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ClinicalErrorBoundary caught an error in [${this.props.componentName || 'Component'}]:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 p-6 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Clinical Component Error Isolation ({this.props.componentName || 'Content Module'})
          </div>
          <p className="text-xs text-slate-700">
            A rendering error occurred while processing clinical text or media formatting. The rest of the patient portal remains operational.
          </p>
          <div className="bg-white p-2.5 rounded border border-amber-200 text-[11px] font-mono text-slate-800 overflow-x-auto">
            {this.state.error?.message || 'Unknown clinical rendering exception'}
          </div>
          <button
            onClick={this.handleReset}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
