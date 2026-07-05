import SwiftUI

@main
struct TapNextWatchApp: App {
    @StateObject private var workoutStore = WorkoutStore()
    @StateObject private var sessionModel = SessionViewModel()

    var body: some Scene {
        WindowGroup {
            WorkoutListView()
                .environmentObject(workoutStore)
                .environmentObject(sessionModel)
                .onAppear {
                    ConnectivityManager.shared.activate(store: workoutStore)
                    sessionModel.loadPendingSnapshot()
                }
        }
    }
}
