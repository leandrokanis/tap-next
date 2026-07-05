import Foundation

public enum EngineStatus: String, Codable, Sendable {
    case running
    case paused
    case finished
}

/// Immutable session state; all timestamps are epoch seconds passed in by
/// the caller, keeping the engine pure (same contract as src/engine/engine.ts).
public struct EngineState: Codable, Equatable, Sendable {
    public var workout: Workout
    public var phases: [Phase]
    public var phaseIndex: Int
    public var status: EngineStatus
    public var startedAt: Double
    public var phaseStartedAt: Double
    public var pausedAt: Double?
    public var pausedSeconds: Double
    public var finishedAt: Double?
    public var completedSets: [LoggedSet]
}

public enum SessionEngine {
    public static func start(_ workout: Workout, at: Double) -> EngineState {
        EngineState(
            workout: workout,
            phases: expandPhases(workout),
            phaseIndex: 0,
            status: .running,
            startedAt: at,
            phaseStartedAt: at,
            pausedAt: nil,
            pausedSeconds: 0,
            finishedAt: nil,
            completedSets: []
        )
    }

    public static func currentPhase(_ state: EngineState) -> Phase? {
        guard state.phaseIndex < state.phases.count else { return nil }
        return state.phases[state.phaseIndex]
    }

    public static func phaseElapsed(_ state: EngineState, at: Double) -> Double {
        guard state.status != .finished else { return 0 }
        let reference = state.status == .paused ? state.pausedAt! : at
        return max(0, reference - state.phaseStartedAt)
    }

    public static func phaseRemaining(_ state: EngineState, at: Double) -> Double? {
        guard let duration = currentPhase(state)?.duration else { return nil }
        return max(0, Double(duration) - phaseElapsed(state, at: at))
    }

    public static func sessionElapsed(_ state: EngineState, at: Double) -> Double {
        let reference: Double
        switch state.status {
        case .finished: reference = state.finishedAt!
        case .paused: reference = state.pausedAt!
        case .running: reference = at
        }
        return max(0, reference - state.startedAt - state.pausedSeconds)
    }

    public static func next(_ state: EngineState, at: Double) -> EngineState {
        guard state.status == .running else { return state }
        return advance(state, at: at, completedAt: at)
    }

    public static func tick(_ state: EngineState, at: Double) -> EngineState {
        var s = state
        while s.status == .running {
            guard let duration = currentPhase(s)?.duration else { break }
            let boundary = s.phaseStartedAt + Double(duration)
            if at < boundary { break }
            s = advance(s, at: boundary, completedAt: boundary)
        }
        return s
    }

    public static func pause(_ state: EngineState, at: Double) -> EngineState {
        guard state.status == .running else { return state }
        var s = state
        s.status = .paused
        s.pausedAt = at
        return s
    }

    public static func resume(_ state: EngineState, at: Double) -> EngineState {
        guard state.status == .paused, let pausedAt = state.pausedAt else { return state }
        let pausedFor = max(0, at - pausedAt)
        var s = state
        s.status = .running
        s.pausedAt = nil
        s.pausedSeconds += pausedFor
        s.phaseStartedAt += pausedFor
        return s
    }

    public static func finish(_ state: EngineState, at: Double) -> EngineState {
        guard state.status != .finished else { return state }
        var s = state.status == .paused ? resume(state, at: at) : state
        s.status = .finished
        s.finishedAt = at
        return s
    }

    public static func updateLoggedSet(
        _ state: EngineState,
        exerciseIndex: Int,
        setIndex: Int,
        reps: Int? = nil,
        weight: Double? = nil
    ) -> EngineState {
        var s = state
        s.completedSets = s.completedSets.map { set in
            guard set.exerciseIndex == exerciseIndex, set.setIndex == setIndex else { return set }
            var updated = set
            if let reps { updated.reps = reps }
            if let weight { updated.weight = weight }
            return updated
        }
        return s
    }

    public static func completedAllPhases(_ state: EngineState) -> Bool {
        state.phaseIndex >= state.phases.count
    }

    public static func summarize(
        _ state: EngineState,
        at: Double,
        id: String,
        source: String
    ) -> SessionRecord {
        SessionRecord(
            id: id,
            workoutName: state.workout.name,
            startedAt: iso8601(state.startedAt),
            durationSeconds: Int(sessionElapsed(state, at: at).rounded()),
            status: completedAllPhases(state) ? "completed" : "partial",
            source: source,
            sets: state.completedSets.map {
                SessionSetRecord(
                    exercise: $0.exercise,
                    setIndex: $0.setIndex,
                    reps: $0.reps,
                    weight: $0.weight,
                    durationSeconds: $0.durationSeconds
                )
            }
        )
    }

    private static func advance(_ state: EngineState, at: Double, completedAt: Double) -> EngineState {
        guard let phase = currentPhase(state) else { return state }
        var s = state
        if phase.type == .work {
            s.completedSets.append(logFor(state, phase: phase, at: at))
        }
        s.phaseIndex += 1
        s.phaseStartedAt = completedAt
        if s.phaseIndex >= s.phases.count {
            s.status = .finished
            s.finishedAt = completedAt
        }
        return s
    }

    private static func logFor(_ state: EngineState, phase: Phase, at: Double) -> LoggedSet {
        let exercise = state.workout.exercises[phase.exerciseIndex]
        var logged = LoggedSet(
            exerciseIndex: phase.exerciseIndex,
            exercise: exercise.name,
            setIndex: phase.setNumber ?? 0,
            reps: nil,
            weight: nil,
            durationSeconds: nil
        )
        if exercise.mode == .reps {
            logged.reps = exercise.reps
        } else {
            let held = min(phaseElapsed(state, at: at), Double(phase.duration ?? 0))
            logged.durationSeconds = Int(held.rounded())
        }
        logged.weight = exercise.weight
        return logged
    }

    private static func iso8601(_ epochSeconds: Double) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date(timeIntervalSince1970: epochSeconds))
    }
}
