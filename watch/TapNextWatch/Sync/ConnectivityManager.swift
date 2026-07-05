import Foundation
import TapNextEngine
import WatchConnectivity

/// Watch side of the WatchConnectivity bridge (ADR 0005):
/// - receives the workout list through the application context (last state
///   wins, iPhone owns it);
/// - delivers finished sessions with transferUserInfo, backed by the disk
///   Outbox — files are deleted only on confirmed delivery.
final class ConnectivityManager: NSObject, WCSessionDelegate {
    static let shared = ConnectivityManager()

    private weak var store: WorkoutStore?

    func activate(store: WorkoutStore) {
        self.store = store
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func send(record: SessionRecord) {
        Outbox.enqueue(record)
        transfer(record)
    }

    private func flushOutbox() {
        let inFlight = Set(
            WCSession.default.outstandingUserInfoTransfers
                .compactMap { ($0.userInfo["session"] as? [String: Any])?["id"] as? String }
        )
        for record in Outbox.pending() where !inFlight.contains(record.id) {
            transfer(record)
        }
    }

    private func transfer(_ record: SessionRecord) {
        guard WCSession.default.activationState == .activated,
              let data = try? JSONEncoder().encode(record),
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { return }
        WCSession.default.transferUserInfo(["type": "session", "session": dict])
    }

    private func applyContext(_ context: [String: Any]) {
        guard let workoutsAny = context["workouts"],
              let data = try? JSONSerialization.data(withJSONObject: workoutsAny),
              let workouts = try? JSONDecoder().decode([Workout].self, from: data)
        else { return }
        Task { @MainActor [weak store] in
            store?.replaceAll(workouts)
        }
    }

    // MARK: - WCSessionDelegate

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        guard activationState == .activated else { return }
        if !session.receivedApplicationContext.isEmpty {
            applyContext(session.receivedApplicationContext)
        }
        flushOutbox()
    }

    func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        applyContext(context)
    }

    func session(
        _ session: WCSession,
        didFinish userInfoTransfer: WCSessionUserInfoTransfer,
        error: Error?
    ) {
        guard error == nil,
              let payload = userInfoTransfer.userInfo["session"] as? [String: Any],
              let id = payload["id"] as? String
        else { return }
        Outbox.remove(id: id)
    }
}
