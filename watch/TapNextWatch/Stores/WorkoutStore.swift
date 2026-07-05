import Foundation
import TapNextEngine

/// Read-only cache of the workouts owned by the iPhone (ADR 0005). Updated
/// from the WCSession application context and persisted so the list
/// survives launches with the phone out of reach.
@MainActor
final class WorkoutStore: ObservableObject {
    @Published private(set) var workouts: [Workout] = []

    private let cacheURL: URL = {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("workouts.json")
    }()

    init() {
        load()
    }

    func replaceAll(_ workouts: [Workout]) {
        self.workouts = workouts
        if let data = try? JSONEncoder().encode(workouts) {
            try? data.write(to: cacheURL, options: .atomic)
        }
    }

    private func load() {
        guard let data = try? Data(contentsOf: cacheURL),
              let cached = try? JSONDecoder().decode([Workout].self, from: data)
        else { return }
        workouts = cached
    }
}
