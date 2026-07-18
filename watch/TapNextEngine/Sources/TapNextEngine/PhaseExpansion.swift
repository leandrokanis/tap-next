import Foundation

/// Mirrors src/engine/phases.ts — behavior changes require a fixture change.
/// Every set is preceded by a `prepare` phase (ADR 0006).
public func expandPhases(_ workout: Workout) -> [Phase] {
    var phases: [Phase] = []
    for (exerciseIndex, exercise) in workout.exercises.enumerated() {
        for setNumber in 1...exercise.sets {
            phases.append(
                Phase(
                    type: .prepare,
                    exerciseIndex: exerciseIndex,
                    setNumber: setNumber,
                    afterSetNumber: nil,
                    mode: exercise.mode,
                    duration: nil
                )
            )
            phases.append(
                Phase(
                    type: .work,
                    exerciseIndex: exerciseIndex,
                    setNumber: setNumber,
                    afterSetNumber: nil,
                    mode: exercise.mode,
                    duration: exercise.mode == .time ? exercise.duration : nil
                )
            )
            let isLastSet = setNumber == exercise.sets
            if !isLastSet, let rest = exercise.restBetweenSets, rest > 0 {
                phases.append(
                    Phase(
                        type: .rest,
                        exerciseIndex: exerciseIndex,
                        setNumber: nil,
                        afterSetNumber: setNumber,
                        mode: nil,
                        duration: rest
                    )
                )
            }
        }
        let isLastExercise = exerciseIndex == workout.exercises.count - 1
        if !isLastExercise, let rest = exercise.restAfterExercise, rest > 0 {
            phases.append(
                Phase(
                    type: .rest,
                    exerciseIndex: exerciseIndex,
                    setNumber: nil,
                    afterSetNumber: exercise.sets,
                    mode: nil,
                    duration: rest
                )
            )
        }
    }
    return phases
}
