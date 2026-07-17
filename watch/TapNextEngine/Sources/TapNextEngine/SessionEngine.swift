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
    /// Start of the current phase; for timed works this already includes the
    /// 3 s entry countdown (the phase starts in the future when entered).
    public var phaseStartedAt: Double
    public var pausedAt: Double?
    public var pausedSeconds: Double
    public var finishedAt: Double?
    public var completedSets: [LoggedSet]
    /// Prospective adjustment applied (and cleared) when the next work set
    /// is logged. Set during prepare via Digital Crown / pickers (RF-06).
    public var upcomingOverride: UpcomingOverride?
    /// Original end of the rest preceding the current prepare (ADR 0006).
    /// Kept even when the rest was cut short; shifted on resume. Nil when
    /// the prepare has no preceding rest.
    public var restDeadline: Double?
}

public enum SessionEngine {
    /// Entry countdown before every timed set (RF-17): 3 → 2 → 1 → go.
    public static let countdownSeconds: Double = 3

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
            completedSets: [],
            upcomingOverride: nil,
            restDeadline: nil
        )
    }

    public static func currentPhase(_ state: EngineState) -> Phase? {
        guard state.phaseIndex < state.phases.count else { return nil }
        return state.phases[state.phaseIndex]
    }

    /// Duration of a timed work phase with any prospective override applied.
    private static func effectiveWorkDuration(_ state: EngineState, phase: Phase) -> Int? {
        guard phase.type == .work, phase.mode == .time else { return nil }
        return state.upcomingOverride?.duration ?? phase.duration
    }

    public static func phaseElapsed(_ state: EngineState, at: Double) -> Double {
        guard state.status != .finished else { return 0 }
        let reference = state.status == .paused ? state.pausedAt! : at
        return max(0, reference - state.phaseStartedAt)
    }

    public static func phaseRemaining(_ state: EngineState, at: Double) -> Double? {
        guard let phase = currentPhase(state) else { return nil }
        let duration: Int?
        switch phase.type {
        case .work: duration = effectiveWorkDuration(state, phase: phase)
        case .rest: duration = phase.duration
        case .prepare: duration = nil
        }
        guard let duration else { return nil }
        return max(0, Double(duration) - phaseElapsed(state, at: at))
    }

    /// Seconds left in the 3-2-1 entry countdown of a timed set (RF-17);
    /// 0 once the set is running, nil outside work phases.
    public static func countdownRemaining(_ state: EngineState, at: Double) -> Double? {
        guard state.status != .finished else { return nil }
        guard let phase = currentPhase(state), phase.type == .work else { return nil }
        let reference = state.status == .paused ? state.pausedAt! : at
        return max(0, state.phaseStartedAt - reference)
    }

    /// Overtime (RF-19 / ADR 0006): seconds past the original end of the
    /// rest preceding the current prepare. Nil without a preceding rest.
    public static func phaseOvertime(_ state: EngineState, at: Double) -> Double? {
        guard state.status != .finished, let phase = currentPhase(state) else { return nil }
        if phase.type == .rest, let duration = phase.duration {
            return max(0, phaseElapsed(state, at: at) - Double(duration))
        }
        guard phase.type == .prepare, let deadline = state.restDeadline else { return nil }
        let reference = state.status == .paused ? state.pausedAt! : at
        return max(0, reference - deadline)
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

    /// Manual advance — the single explicit action. In prepare it starts the
    /// set (Iniciar); in work it completes a reps set or ends a timed set
    /// early; in rest it cuts the rest short, opening the next prepare.
    public static func next(_ state: EngineState, at: Double) -> EngineState {
        guard state.status == .running else { return state }
        return advance(state, at: at, completedAt: at)
    }

    /// Clock tick. Auto-advances timed WORK phases and rests at their
    /// boundary (into the next prepare — ADR 0006), cascading with exact
    /// boundary times. Prepare phases never auto-advance.
    public static func tick(_ state: EngineState, at: Double) -> EngineState {
        var s = state
        while s.status == .running {
            guard let phase = currentPhase(s), phase.type != .prepare else { break }
            let duration = phase.type == .work
                ? effectiveWorkDuration(s, phase: phase)
                : phase.duration
            guard let duration else { break }
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
        if let deadline = s.restDeadline { s.restDeadline = deadline + pausedFor }
        return s
    }

    public static func finish(_ state: EngineState, at: Double) -> EngineState {
        guard state.status != .finished else { return state }
        var s = state.status == .paused ? resume(state, at: at) : state
        s.status = .finished
        s.finishedAt = at
        return s
    }

    /// Prospective adjustment (RF-06): merge reps/weight/duration into the
    /// pending override for the UPCOMING work set. Applied and cleared when
    /// that set is logged; sets logged with an override are flagged `adjusted`.
    public static func setUpcomingOverride(
        _ state: EngineState,
        reps: Int? = nil,
        weight: Double? = nil,
        duration: Int? = nil
    ) -> EngineState {
        var s = state
        var override = s.upcomingOverride ?? UpcomingOverride()
        if let reps { override.reps = reps }
        if let weight { override.weight = weight }
        if let duration { override.duration = duration }
        s.upcomingOverride = override
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
            plannedSets: state.phases.filter { $0.type == .work }.count,
            sets: state.completedSets.map {
                SessionSetRecord(
                    exercise: $0.exercise,
                    setIndex: $0.setIndex,
                    reps: $0.reps,
                    weight: $0.weight,
                    durationSeconds: $0.durationSeconds,
                    adjusted: $0.adjusted
                )
            }
        )
    }

    /// Move past the current phase. `completedAt` becomes the next phase's
    /// start — shifted by the entry countdown when a prepare opens a timed
    /// set. Leaving a rest records its original deadline for overtime.
    private static func advance(_ state: EngineState, at: Double, completedAt: Double) -> EngineState {
        guard let phase = currentPhase(state) else { return state }
        var s = state
        if phase.type == .work {
            s.completedSets.append(logFor(state, phase: phase, at: at))
            s.upcomingOverride = nil
        }
        s.restDeadline = phase.type == .rest
            ? state.phaseStartedAt + Double(phase.duration ?? 0)
            : nil
        s.phaseIndex += 1
        let nextPhase = s.phaseIndex < s.phases.count ? s.phases[s.phaseIndex] : nil
        let entersTimedWork = phase.type == .prepare && nextPhase?.type == .work && nextPhase?.mode == .time
        s.phaseStartedAt = entersTimedWork ? completedAt + countdownSeconds : completedAt
        if s.phaseIndex >= s.phases.count {
            s.status = .finished
            s.finishedAt = completedAt
        }
        return s
    }

    private static func logFor(_ state: EngineState, phase: Phase, at: Double) -> LoggedSet {
        let exercise = state.workout.exercises[phase.exerciseIndex]
        let override = state.upcomingOverride
        var logged = LoggedSet(
            exerciseIndex: phase.exerciseIndex,
            exercise: exercise.name,
            setIndex: phase.setNumber ?? 0,
            reps: nil,
            weight: nil,
            durationSeconds: nil,
            adjusted: nil
        )
        if exercise.mode == .reps {
            logged.reps = override?.reps ?? exercise.reps
        } else {
            let duration = Double(effectiveWorkDuration(state, phase: phase) ?? 0)
            let held = min(phaseElapsed(state, at: at), duration)
            logged.durationSeconds = Int(held.rounded())
        }
        logged.weight = override?.weight ?? exercise.weight
        if let override, override.reps != nil || override.weight != nil || override.duration != nil {
            logged.adjusted = true
        }
        return logged
    }

    private static func iso8601(_ epochSeconds: Double) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date(timeIntervalSince1970: epochSeconds))
    }
}
