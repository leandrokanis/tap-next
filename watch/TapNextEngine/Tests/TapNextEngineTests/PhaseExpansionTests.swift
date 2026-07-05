import XCTest

@testable import TapNextEngine

final class PhaseExpansionTests: XCTestCase {
    func testInterleavesRestsAndOmitsTrailingRest() {
        let workout = Workout(
            name: "Costas + core",
            exercises: [
                Exercise(name: "Remada", mode: .reps, sets: 2, reps: 12, restBetweenSets: 60, restAfterExercise: 120),
                Exercise(name: "Prancha", mode: .time, sets: 2, duration: 30, restBetweenSets: 15),
            ]
        )
        let phases = expandPhases(workout)
        XCTAssertEqual(phases.count, 7)
        XCTAssertEqual(phases[0].type, .work)
        XCTAssertEqual(phases[1].type, .rest)
        XCTAssertEqual(phases[1].duration, 60)
        XCTAssertEqual(phases[3].duration, 120)
        XCTAssertEqual(phases[4].mode, .time)
        XCTAssertEqual(phases[4].duration, 30)
        XCTAssertEqual(phases.last?.type, .work)
    }

    func testNoRestPhasesWhenRestAbsent() {
        let workout = Workout(
            name: "X",
            exercises: [Exercise(name: "A", mode: .reps, sets: 3, reps: 15)]
        )
        let phases = expandPhases(workout)
        XCTAssertEqual(phases.count, 3)
        XCTAssertTrue(phases.allSatisfy { $0.type == .work })
    }
}
