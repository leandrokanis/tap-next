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
    /// Active seconds spent in completed leadin count-ins — preparation
    /// time, excluded from sessionElapsed like pauses (RF-17, ADR 0006).
    public var leadinSeconds: Double
    public var finishedAt: Double?
    public var completedSets: [LoggedSet]
    /// Prospective adjustment applied (and cleared) when the next work set
    /// is logged. Set during rest via Digital Crown / steppers (RF-06).
    public var upcomingOverride: UpcomingOverride?

    init(
        workout: Workout,
        phases: [Phase],
        phaseIndex: Int,
        status: EngineStatus,
        startedAt: Double,
        phaseStartedAt: Double,
        pausedAt: Double?,
        pausedSeconds: Double,
        leadinSeconds: Double,
        finishedAt: Double?,
        completedSets: [LoggedSet],
        upcomingOverride: UpcomingOverride?
    ) {
        self.workout = workout
        self.phases = phases
        self.phaseIndex = phaseIndex
        self.status = status
        self.startedAt = startedAt
        self.phaseStartedAt = phaseStartedAt
        self.pausedAt = pausedAt
        self.pausedSeconds = pausedSeconds
        self.leadinSeconds = leadinSeconds
        self.finishedAt = finishedAt
        self.completedSets = completedSets
        self.upcomingOverride = upcomingOverride
    }

    /// Snapshots written before the leadin phase existed lack
    /// `leadinSeconds` — hydrate them with 0 (mirror of the TS loader).
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        workout = try container.decode(Workout.self, forKey: .workout)
        phases = try container.decode([Phase].self, forKey: .phases)
        phaseIndex = try container.decode(Int.self, forKey: .phaseIndex)
        status = try container.decode(EngineStatus.self, forKey: .status)
        startedAt = try container.decode(Double.self, forKey: .startedAt)
        phaseStartedAt = try container.decode(Double.self, forKey: .phaseStartedAt)
        pausedAt = try container.decodeIfPresent(Double.self, forKey: .pausedAt)
        pausedSeconds = try container.decode(Double.self, forKey: .pausedSeconds)
        leadinSeconds = try container.decodeIfPresent(Double.self, forKey: .leadinSeconds) ?? 0
        finishedAt = try container.decodeIfPresent(Double.self, forKey: .finishedAt)
        completedSets = try container.decode([LoggedSet].self, forKey: .completedSets)
        upcomingOverride = try container.decodeIfPresent(UpcomingOverride.self, forKey: .upcomingOverride)
    }
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
            leadinSeconds: 0,
            finishedAt: nil,
            completedSets: [],
            upcomingOverride: nil
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

    /// Seconds past a rest's prescribed duration (RF-02b). 0 while the rest
    /// is still counting down; nil outside a rest phase.
    public static func phaseOvertime(_ state: EngineState, at: Double) -> Double? {
        guard let phase = currentPhase(state), phase.type == .rest,
              let duration = phase.duration else { return nil }
        return max(0, phaseElapsed(state, at: at) - Double(duration))
    }

    /// Active session duration — pauses and leadin count-ins excluded, the
    /// session clock holds still during a count-in (RF-17).
    public static func sessionElapsed(_ state: EngineState, at: Double) -> Double {
        let reference: Double
        switch state.status {
        case .finished: reference = state.finishedAt!
        case .paused: reference = state.pausedAt!
        case .running: reference = at
        }
        let base = reference - state.startedAt - state.pausedSeconds - state.leadinSeconds
        return max(0, base - liveLeadinSeconds(state, at: at))
    }

    /// Active time in an in-flight leadin, so the exclusion applies live.
    private static func liveLeadinSeconds(_ state: EngineState, at: Double) -> Double {
        guard currentPhase(state)?.type == .leadin else { return 0 }
        if state.status == .finished {
            return max(0, state.finishedAt! - state.phaseStartedAt)
        }
        return phaseElapsed(state, at: at)
    }

    public static func next(_ state: EngineState, at: Double) -> EngineState {
        guard state.status == .running else { return state }
        return advance(state, at: at, completedAt: at)
    }

    /// Clock tick. Auto-advances timed WORK phases (isometrics) whose
    /// duration elapsed. Rests never auto-advance (RF-02b): past their
    /// boundary they stay put, counting overtime, until an explicit `next`.
    public static func tick(_ state: EngineState, at: Double) -> EngineState {
        var s = state
        while s.status == .running {
            guard let phase = currentPhase(s), phase.type != .rest,
                  let duration = phase.duration else { break }
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

    /// Prospective adjustment (RF-06): merge reps/weight into the pending
    /// override for the UPCOMING work set. Applied and cleared when that set
    /// is logged; sets logged with an override are flagged `adjusted`.
    public static func setUpcomingOverride(
        _ state: EngineState,
        reps: Int? = nil,
        weight: Double? = nil
    ) -> EngineState {
        var s = state
        var override = s.upcomingOverride ?? UpcomingOverride()
        if let reps { override.reps = reps }
        if let weight { override.weight = weight }
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

    private static func advance(_ state: EngineState, at: Double, completedAt: Double) -> EngineState {
        guard let phase = currentPhase(state) else { return state }
        var s = state
        if phase.type == .work {
            s.completedSets.append(logFor(state, phase: phase, at: at))
            s.upcomingOverride = nil
        }
        if phase.type == .leadin {
            s.leadinSeconds += max(0, completedAt - state.phaseStartedAt)
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
            let held = min(phaseElapsed(state, at: at), Double(phase.duration ?? 0))
            logged.durationSeconds = Int(held.rounded())
        }
        logged.weight = override?.weight ?? exercise.weight
        if let override, override.reps != nil || override.weight != nil {
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
