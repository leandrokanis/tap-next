import Foundation
import XCTest

@testable import TapNextEngine

/// Runs the shared fixtures in fixtures/engine/ — the executable spec both
/// engines must satisfy (ADR 0002). The TypeScript counterpart is
/// src/engine/__tests__/fixtures.test.ts.
final class FixtureTests: XCTestCase {
    func testAllSharedFixtures() throws {
        let dir = fixturesDirectory()
        let files = try FileManager.default
            .contentsOfDirectory(atPath: dir.path)
            .filter { $0.hasSuffix(".json") }
            .sorted()
        XCTAssertFalse(files.isEmpty, "no fixtures found at \(dir.path)")

        for file in files {
            let data = try Data(contentsOf: dir.appendingPathComponent(file))
            try runFixture(data: data, label: file)
        }
    }

    private func fixturesDirectory() -> URL {
        // …/watch/TapNextEngine/Tests/TapNextEngineTests/FixtureTests.swift → repo root
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("fixtures")
            .appendingPathComponent("engine")
    }

    private func runFixture(data: Data, label: String) throws {
        let root = try XCTUnwrap(
            try JSONSerialization.jsonObject(with: data) as? [String: Any],
            "\(label): fixture is not an object"
        )
        let workoutData = try JSONSerialization.data(
            withJSONObject: try XCTUnwrap(root["workout"], "\(label): missing workout"))
        let workout = try JSONDecoder().decode(Workout.self, from: workoutData)
        let steps = try XCTUnwrap(root["steps"] as? [[String: Any]], "\(label): missing steps")

        var state: EngineState?
        var lastAt: Double = 0

        for (index, step) in steps.enumerated() {
            let stepLabel = "\(label) step \(index)"
            if let event = step["event"] as? String {
                lastAt = (step["at"] as? NSNumber)?.doubleValue ?? lastAt
                state = try applyEvent(event, step: step, state: state, workout: workout, at: lastAt, label: stepLabel)
            } else if let expected = step["expect"] as? [String: Any] {
                let current = try XCTUnwrap(state, "\(stepLabel): expect before start")
                assertExpectation(current, expected: expected, at: lastAt, label: stepLabel)
            } else {
                XCTFail("\(stepLabel): step has neither event nor expect")
            }
        }
    }

    private func applyEvent(
        _ event: String,
        step: [String: Any],
        state: EngineState?,
        workout: Workout,
        at: Double,
        label: String
    ) throws -> EngineState {
        if event == "start" { return SessionEngine.start(workout, at: at) }
        let current = try XCTUnwrap(state, "\(label): \(event) before start")
        switch event {
        case "next": return SessionEngine.next(current, at: at)
        case "tick": return SessionEngine.tick(current, at: at)
        case "pause": return SessionEngine.pause(current, at: at)
        case "resume": return SessionEngine.resume(current, at: at)
        case "finish": return SessionEngine.finish(current, at: at)
        case "updateSet":
            return SessionEngine.updateLoggedSet(
                current,
                exerciseIndex: (step["exerciseIndex"] as? NSNumber)?.intValue ?? 0,
                setIndex: (step["setIndex"] as? NSNumber)?.intValue ?? 0,
                reps: (step["reps"] as? NSNumber)?.intValue,
                weight: (step["weight"] as? NSNumber)?.doubleValue
            )
        default:
            XCTFail("\(label): unknown event \(event)")
            return current
        }
    }

    private func assertExpectation(
        _ state: EngineState,
        expected: [String: Any],
        at: Double,
        label: String
    ) {
        let phase = SessionEngine.currentPhase(state)

        if let status = expected["status"] as? String {
            XCTAssertEqual(state.status.rawValue, status, "\(label): status")
        }
        if let phaseKind = expected["phase"] as? String {
            let actual = state.status == .finished ? "done" : phase?.type.rawValue
            XCTAssertEqual(actual, phaseKind, "\(label): phase")
        }
        if let exercise = expected["exercise"] as? String {
            let name = phase.map { state.workout.exercises[$0.exerciseIndex].name }
            XCTAssertEqual(name, exercise, "\(label): exercise")
        }
        if let setNumber = (expected["setNumber"] as? NSNumber)?.intValue {
            let actual = phase?.type == .work ? phase?.setNumber : phase?.afterSetNumber
            XCTAssertEqual(actual, setNumber, "\(label): setNumber")
        }
        if expected.keys.contains("remaining") {
            let remaining = SessionEngine.phaseRemaining(state, at: at).map { Int($0.rounded()) }
            if expected["remaining"] is NSNull {
                XCTAssertNil(remaining, "\(label): remaining should be null")
            } else {
                XCTAssertEqual(remaining, (expected["remaining"] as? NSNumber)?.intValue, "\(label): remaining")
            }
        }
        if let elapsed = (expected["elapsed"] as? NSNumber)?.intValue {
            XCTAssertEqual(Int(SessionEngine.phaseElapsed(state, at: at).rounded()), elapsed, "\(label): elapsed")
        }
        if let sessionElapsed = (expected["sessionElapsed"] as? NSNumber)?.intValue {
            XCTAssertEqual(
                Int(SessionEngine.sessionElapsed(state, at: at).rounded()),
                sessionElapsed,
                "\(label): sessionElapsed"
            )
        }
        if let completedSets = (expected["completedSets"] as? NSNumber)?.intValue {
            XCTAssertEqual(state.completedSets.count, completedSets, "\(label): completedSets")
        }
        if let completedAll = expected["completedAll"] as? Bool {
            XCTAssertEqual(SessionEngine.completedAllPhases(state), completedAll, "\(label): completedAll")
        }
        if let lastSet = expected["lastSet"] as? [String: Any] {
            guard let last = state.completedSets.last else {
                XCTFail("\(label): lastSet expected but no sets logged")
                return
            }
            if let exercise = lastSet["exercise"] as? String {
                XCTAssertEqual(last.exercise, exercise, "\(label): lastSet.exercise")
            }
            if let setIndex = (lastSet["setIndex"] as? NSNumber)?.intValue {
                XCTAssertEqual(last.setIndex, setIndex, "\(label): lastSet.setIndex")
            }
            if let reps = (lastSet["reps"] as? NSNumber)?.intValue {
                XCTAssertEqual(last.reps, reps, "\(label): lastSet.reps")
            }
            if let weight = (lastSet["weight"] as? NSNumber)?.doubleValue {
                XCTAssertEqual(last.weight ?? .nan, weight, accuracy: 0.001, "\(label): lastSet.weight")
            }
            if let durationSeconds = (lastSet["durationSeconds"] as? NSNumber)?.intValue {
                XCTAssertEqual(last.durationSeconds, durationSeconds, "\(label): lastSet.durationSeconds")
            }
        }
    }
}
