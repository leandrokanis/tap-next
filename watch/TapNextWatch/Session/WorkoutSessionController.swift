import Foundation
import HealthKit

/// Runs the session inside an HKWorkoutSession (ADR 0004): keeps the app
/// alive with the wrist down, guarantees haptics, and records the workout
/// (heart rate, calories, rings) to Apple Health.
final class WorkoutSessionController: NSObject {
    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let share: Set<HKSampleType> = [HKObjectType.workoutType()]
        let read: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        healthStore.requestAuthorization(toShare: share, read: read) { _, _ in }
    }

    func begin() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .traditionalStrengthTraining
        configuration.locationType = .indoor
        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: configuration)
            session.startActivity(with: Date())
            builder.beginCollection(withStart: Date()) { _, _ in }
            self.session = session
            self.builder = builder
        } catch {
            // Session still works as a plain timer; it just won't survive
            // wrist-down. Never block training on HealthKit.
        }
    }

    func end(discard: Bool) {
        guard let session, let builder else { return }
        session.end()
        builder.endCollection(withEnd: Date()) { _, _ in
            if discard {
                builder.discardWorkout()
            } else {
                builder.finishWorkout { _, _ in }
            }
        }
        self.session = nil
        self.builder = nil
    }
}
