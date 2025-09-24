import { WebViewState, type StateTransition } from './types';

export class StateManager {
  private currentState: WebViewState = WebViewState.CLOSED;
  private stateHistory: StateTransition[] = [];
  private onStateChange: (oldState: WebViewState, newState: WebViewState, reason?: string) => void;
  private sessionTimeout: number;
  private transitionTimeout: NodeJS.Timeout | null = null;

  constructor(
    onStateChange: (oldState: WebViewState, newState: WebViewState, reason?: string) => void,
    sessionTimeout: number
  ) {
    this.onStateChange = onStateChange;
    this.sessionTimeout = sessionTimeout;
  }

  public getCurrentState(): WebViewState {
    return this.currentState;
  }

  public getStateHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  public canTransitionTo(newState: WebViewState): boolean {
    return this.isValidTransition(this.currentState, newState);
  }

  public transitionTo(newState: WebViewState, reason?: string): boolean {
    if (!this.canTransitionTo(newState)) {
      // Invalid transition
      return false;
    }

    const oldState = this.currentState;

    // Handle transitioning state for smooth UX
    if (this.shouldUseTransitioningState(oldState, newState)) {
      this.setTransitioningState(oldState, newState, reason);
      return true;
    }

    this.performStateTransition(oldState, newState, reason);
    return true;
  }

  public forceTransitionTo(newState: WebViewState, reason?: string): void {
    const oldState = this.currentState;
    this.performStateTransition(oldState, newState, reason || 'Forced transition');
  }

  public cleanup(): void {
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
  }

  private isValidTransition(from: WebViewState, to: WebViewState): boolean {
    const validTransitions: Record<WebViewState, WebViewState[]> = {
      [WebViewState.CLOSED]: [
        WebViewState.VISIBLE_AUTH,
        WebViewState.TRANSITIONING
      ],
      [WebViewState.VISIBLE_AUTH]: [
        WebViewState.INVISIBLE_SESSION,
        WebViewState.CLOSED,
        WebViewState.TRANSITIONING
      ],
      [WebViewState.INVISIBLE_SESSION]: [
        WebViewState.VISIBLE_AUTH,
        WebViewState.CLOSED,
        WebViewState.TRANSITIONING
      ],
      [WebViewState.TRANSITIONING]: [
        WebViewState.VISIBLE_AUTH,
        WebViewState.INVISIBLE_SESSION,
        WebViewState.CLOSED
      ]
    };

    return validTransitions[from].includes(to);
  }

  private shouldUseTransitioningState(from: WebViewState, to: WebViewState): boolean {
    // Use transitioning state when moving between visible and invisible
    return (
      (from === WebViewState.VISIBLE_AUTH && to === WebViewState.INVISIBLE_SESSION) ||
      (from === WebViewState.INVISIBLE_SESSION && to === WebViewState.VISIBLE_AUTH)
    );
  }

  private setTransitioningState(from: WebViewState, to: WebViewState, reason?: string): void {
    // First transition to TRANSITIONING
    this.performStateTransition(from, WebViewState.TRANSITIONING, `Transitioning from ${from} to ${to}: ${reason}`);

    // Set timeout to complete the transition
    this.transitionTimeout = setTimeout(() => {
      this.performStateTransition(WebViewState.TRANSITIONING, to, `Completed transition to ${to}`);
      this.transitionTimeout = null;
    }, 300); // 300ms transition duration
  }

  private performStateTransition(oldState: WebViewState, newState: WebViewState, reason?: string): void {
    this.currentState = newState;

    const transition: StateTransition = {
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      reason
    };

    this.stateHistory.push(transition);

    // Keep history manageable (last 50 transitions)
    if (this.stateHistory.length > 50) {
      this.stateHistory = this.stateHistory.slice(-50);
    }

    this.onStateChange(oldState, newState, reason);
  }

  public getLastTransition(): StateTransition | null {
    return this.stateHistory.length > 0 ? this.stateHistory[this.stateHistory.length - 1] : null;
  }

  public hasBeenInState(state: WebViewState): boolean {
    return this.stateHistory.some(transition => transition.to === state || transition.from === state);
  }

  public getTimeInCurrentState(): number {
    const lastTransition = this.getLastTransition();
    if (!lastTransition) {
      return 0;
    }
    return Date.now() - lastTransition.timestamp;
  }

  public isInActiveState(): boolean {
    return this.currentState !== WebViewState.CLOSED;
  }
}