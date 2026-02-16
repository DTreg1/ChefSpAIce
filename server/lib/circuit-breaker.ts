import { logger } from "./logger";
import { AppError } from "../middleware/errorHandler";

type CircuitState = "closed" | "open" | "half-open";

interface ServiceCircuit {
  state: CircuitState;
  failures: number;
  firstFailureAt: number;
  openedAt: number;
  lastError: string;
}

const FAILURE_THRESHOLD = 5;
const FAILURE_WINDOW_MS = 60_000;
const OPEN_DURATION_MS = 30_000;

const circuits = new Map<string, ServiceCircuit>();

function getCircuit(service: string): ServiceCircuit {
  let circuit = circuits.get(service);
  if (!circuit) {
    circuit = {
      state: "closed",
      failures: 0,
      firstFailureAt: 0,
      openedAt: 0,
      lastError: "",
    };
    circuits.set(service, circuit);
  }
  return circuit;
}

function transitionTo(service: string, circuit: ServiceCircuit, newState: CircuitState): void {
  const oldState = circuit.state;
  circuit.state = newState;
  logger.warn("Circuit breaker state transition", {
    service,
    from: oldState,
    to: newState,
    failures: circuit.failures,
    lastError: circuit.lastError,
  });
}

function recordSuccess(service: string): void {
  const circuit = getCircuit(service);
  if (circuit.state === "half-open") {
    transitionTo(service, circuit, "closed");
  }
  circuit.failures = 0;
  circuit.firstFailureAt = 0;
}

function recordFailure(service: string, error: unknown): void {
  const circuit = getCircuit(service);
  const now = Date.now();
  const errMsg = error instanceof Error ? error.message : String(error);

  if (circuit.firstFailureAt > 0 && now - circuit.firstFailureAt > FAILURE_WINDOW_MS) {
    circuit.failures = 0;
    circuit.firstFailureAt = 0;
  }

  circuit.failures += 1;
  circuit.lastError = errMsg;

  if (circuit.firstFailureAt === 0) {
    circuit.firstFailureAt = now;
  }

  if (circuit.state === "half-open") {
    circuit.openedAt = now;
    transitionTo(service, circuit, "open");
    return;
  }

  if (circuit.failures >= FAILURE_THRESHOLD && circuit.state === "closed") {
    circuit.openedAt = now;
    transitionTo(service, circuit, "open");
  }
}

function assertCircuitAllows(service: string): void {
  const circuit = getCircuit(service);

  if (circuit.state === "closed") {
    return;
  }

  const now = Date.now();

  if (circuit.state === "open" && now - circuit.openedAt >= OPEN_DURATION_MS) {
    transitionTo(service, circuit, "half-open");
    return;
  }

  if (circuit.state === "half-open") {
    return;
  }

  throw AppError.serviceUnavailable(
    `The ${service} service is temporarily unavailable. Please try again in a few moments.`,
    "SERVICE_CIRCUIT_OPEN",
  );
}

export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>,
): Promise<T> {
  assertCircuitAllows(service);

  try {
    const result = await fn();
    recordSuccess(service);
    return result;
  } catch (error) {
    if (error instanceof AppError && error.errorCode === "SERVICE_CIRCUIT_OPEN") {
      throw error;
    }
    recordFailure(service, error);
    throw error;
  }
}

export function getCircuitState(service: string): { state: CircuitState; failures: number } {
  const circuit = getCircuit(service);
  return { state: circuit.state, failures: circuit.failures };
}

export function resetCircuit(service: string): void {
  circuits.delete(service);
}
