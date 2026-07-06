import Foundation
import SwiftUI
import TapNextEngine
import WatchKit

/// Drives SessionEngine on the Watch: 250ms tick, haptic on phase change,
/// crash snapshot on every transition (RF-08), outbox delivery on finish.
@MainActor
final class SessionViewModel: ObservableObject {
    @Published private(set) var state: EngineState?
    @Published private(set) var now: Double = Date().timeIntervalSince1970
    @Published var isActive = false
    @Published private(set) var pendingSnapshot: EngineState?

    private let workoutController = WorkoutSessionController()
    private var timer: Timer?
    private var lastPhaseIndex = -1
    /// Fase de descanso que já teve o háptico de "zerou" (RF-02b).
    private var restSignaledPhaseIndex = -1

    private let snapshotURL: URL = {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return dir.appendingPathComponent("activeSession.json")
    }()

    // MARK: - Lifecycle

    func start(workout: Workout) {
        workoutController.requestAuthorization()
        workoutController.begin()
        let s = SessionEngine.start(workout, at: Date().timeIntervalSince1970)
        lastPhaseIndex = s.phaseIndex
        state = s
        isActive = true
        saveSnapshot(s)
        startTimer()
    }

    func loadPendingSnapshot() {
        guard let data = try? Data(contentsOf: snapshotURL),
              let snapshot = try? JSONDecoder().decode(EngineState.self, from: data),
              snapshot.status != .finished
        else { return }
        pendingSnapshot = snapshot
    }

    func resumePendingSnapshot() {
        guard var snapshot = pendingSnapshot else { return }
        if snapshot.status == .running {
            // The clock kept flowing while we were dead; hold at the last
            // known moment so the user resumes deliberately.
            snapshot.status = .paused
            snapshot.pausedAt = snapshot.phaseStartedAt
        }
        pendingSnapshot = nil
        lastPhaseIndex = snapshot.phaseIndex
        workoutController.requestAuthorization()
        workoutController.begin()
        state = snapshot
        isActive = true
        startTimer()
    }

    func discardPendingSnapshot() {
        pendingSnapshot = nil
        try? FileManager.default.removeItem(at: snapshotURL)
    }

    // MARK: - Controls

    func next() { mutate { SessionEngine.next($0, at: self.epochNow()) } }
    func pause() { mutate { SessionEngine.pause($0, at: self.epochNow()) } }
    func resume() { mutate { SessionEngine.resume($0, at: self.epochNow()) } }

    /// Ajuste prospectivo do PRÓXIMO set durante o descanso (RF-06).
    func setUpcomingOverride(reps: Int? = nil, weight: Double? = nil) {
        mutate { SessionEngine.setUpcomingOverride($0, reps: reps, weight: weight) }
    }

    /// "Salvar e sair" — partial record straight to the outbox.
    func finishAndSave() {
        guard let current = state else { return }
        persist(SessionEngine.finish(current, at: epochNow()))
    }

    func discard() {
        workoutController.end(discard: true)
        cleanupSession()
    }

    // MARK: - Internals

    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.handleTick() }
        }
    }

    private func handleTick() {
        now = epochNow()
        guard let current = state, current.status == .running else { return }
        let ticked = SessionEngine.tick(current, at: now)
        state = ticked
        if ticked.phaseIndex != lastPhaseIndex {
            lastPhaseIndex = ticked.phaseIndex
            WKInterfaceDevice.current().play(.notification)
            saveSnapshot(ticked)
        }
        // Descanso zerou (RF-02b): o motor segura em overtime, então não há
        // mudança de fase — o háptico dispara aqui, uma vez por descanso.
        if let phase = SessionEngine.currentPhase(ticked),
           phase.type == .rest,
           restSignaledPhaseIndex != ticked.phaseIndex,
           (SessionEngine.phaseRemaining(ticked, at: now) ?? 1) <= 0 {
            restSignaledPhaseIndex = ticked.phaseIndex
            WKInterfaceDevice.current().play(.notification)
        }
        if ticked.status == .finished, SessionEngine.completedAllPhases(ticked) {
            persist(ticked)
        }
    }

    private func mutate(_ transform: (EngineState) -> EngineState) {
        guard let current = state else { return }
        let updated = transform(current)
        state = updated
        if updated.phaseIndex != lastPhaseIndex {
            lastPhaseIndex = updated.phaseIndex
            WKInterfaceDevice.current().play(.notification)
            saveSnapshot(updated)
        }
        if updated.status == .finished, SessionEngine.completedAllPhases(updated) {
            persist(updated)
        }
    }

    private func persist(_ finished: EngineState) {
        let record = SessionEngine.summarize(
            finished,
            at: epochNow(),
            id: UUID().uuidString.lowercased(),
            source: "watch"
        )
        ConnectivityManager.shared.send(record: record)
        workoutController.end(discard: false)
        WKInterfaceDevice.current().play(.success)
        cleanupSession()
    }

    private func cleanupSession() {
        timer?.invalidate()
        timer = nil
        lastPhaseIndex = -1
        restSignaledPhaseIndex = -1
        state = nil
        isActive = false
        try? FileManager.default.removeItem(at: snapshotURL)
    }

    private func saveSnapshot(_ state: EngineState) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        try? data.write(to: snapshotURL, options: .atomic)
    }

    private func epochNow() -> Double { Date().timeIntervalSince1970 }
}
