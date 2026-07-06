import Foundation

public enum ExerciseMode: String, Codable, Sendable {
    case reps
    case time
}

public struct Exercise: Codable, Equatable, Sendable {
    public var name: String
    public var mode: ExerciseMode
    public var sets: Int
    public var reps: Int?
    public var duration: Int?
    public var weight: Double?
    public var restBetweenSets: Int?
    public var restAfterExercise: Int?
    public var notes: String?

    public init(
        name: String,
        mode: ExerciseMode,
        sets: Int,
        reps: Int? = nil,
        duration: Int? = nil,
        weight: Double? = nil,
        restBetweenSets: Int? = nil,
        restAfterExercise: Int? = nil,
        notes: String? = nil
    ) {
        self.name = name
        self.mode = mode
        self.sets = sets
        self.reps = reps
        self.duration = duration
        self.weight = weight
        self.restBetweenSets = restBetweenSets
        self.restAfterExercise = restAfterExercise
        self.notes = notes
    }
}

public struct Workout: Codable, Equatable, Sendable {
    public var version: Int
    public var name: String
    public var exercises: [Exercise]

    public init(version: Int = 1, name: String, exercises: [Exercise]) {
        self.version = version
        self.name = name
        self.exercises = exercises
    }
}

/// Same shape as the TS `Phase` union so crash snapshots and fixtures stay
/// byte-compatible across implementations.
public struct Phase: Codable, Equatable, Sendable {
    public enum Kind: String, Codable, Sendable {
        case leadin
        case work
        case rest
    }

    public var type: Kind
    public var exerciseIndex: Int
    /// 1-based; present on leadin and work phases.
    public var setNumber: Int?
    /// Present on rest phases: the set just performed.
    public var afterSetNumber: Int?
    public var mode: ExerciseMode?
    /// Seconds; present on leadin, rest and timed work phases.
    public var duration: Int?
}

public struct LoggedSet: Codable, Equatable, Sendable {
    public var exerciseIndex: Int
    public var exercise: String
    public var setIndex: Int
    public var reps: Int?
    public var weight: Double?
    public var durationSeconds: Int?
    /// True when the set was adjusted prospectively during rest (RF-06).
    public var adjusted: Bool?
}

/// Prospective adjustment pending for the upcoming work set (RF-06).
public struct UpcomingOverride: Codable, Equatable, Sendable {
    public var reps: Int?
    public var weight: Double?

    public init(reps: Int? = nil, weight: Double? = nil) {
        self.reps = reps
        self.weight = weight
    }
}

public struct SessionSetRecord: Codable, Equatable, Sendable {
    public var exercise: String
    public var setIndex: Int
    public var reps: Int?
    public var weight: Double?
    public var durationSeconds: Int?
    /// True when the set was adjusted prospectively during rest (RF-06).
    public var adjusted: Bool?
}

public struct SessionRecord: Codable, Equatable, Sendable {
    public var id: String
    public var workoutName: String
    public var startedAt: String
    public var durationSeconds: Int
    public var status: String
    public var source: String
    /// Total sets prescribed by the workout (for "partial n/m" badges).
    public var plannedSets: Int?
    public var sets: [SessionSetRecord]
}
