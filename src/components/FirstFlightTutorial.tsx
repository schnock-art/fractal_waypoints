import { firstFlightSteps, type FirstFlightState } from '../app/firstFlight';

interface FirstFlightTutorialProps {
  state: FirstFlightState;
  onSkip: () => void;
  onRestart: () => void;
  onContinue: () => void;
}

export function FirstFlightTutorial({ state, onSkip, onRestart, onContinue }: FirstFlightTutorialProps) {
  const stepIndex = firstFlightSteps.findIndex((step) => step.id === state);
  const step = stepIndex >= 0 ? firstFlightSteps[stepIndex] : null;

  if (state === 'dismissed') {
    return (
      <aside className="first-flight first-flight--launcher" data-testid="first-flight">
        <button type="button" onClick={onRestart}>Start first flight</button>
      </aside>
    );
  }

  return (
    <aside className={state === 'reviewControls' ? 'first-flight first-flight--settings' : 'first-flight'} data-testid="first-flight">
      {step ? (
        <>
          <p>First flight · {stepIndex + 1}/{firstFlightSteps.length}</p>
          <strong>{step.title}</strong>
          <span>{step.body}</span>
          <div className="first-flight__progress" aria-label={`Step ${stepIndex + 1} of ${firstFlightSteps.length}`}>
            {firstFlightSteps.map((entry, index) => <i key={entry.id} className={index <= stepIndex ? 'is-active' : ''} />)}
          </div>
          <div className="first-flight__actions">
            {state === 'reviewControls' ? <button type="button" onClick={onContinue}>Continue flight</button> : null}
            <button type="button" onClick={onSkip}>Skip tutorial</button>
          </div>
        </>
      ) : (
        <>
          <p>First flight</p>
          <strong>Flight complete</strong>
          <span>You have navigated, linked, tuned, and saved a portal.</span>
          <button type="button" onClick={onRestart}>Restart first flight</button>
        </>
      )}
    </aside>
  );
}
