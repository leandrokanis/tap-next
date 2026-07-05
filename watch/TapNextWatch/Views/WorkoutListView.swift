import SwiftUI
import TapNextEngine

struct WorkoutListView: View {
    @EnvironmentObject private var store: WorkoutStore
    @EnvironmentObject private var model: SessionViewModel

    var body: some View {
        NavigationStack {
            List {
                if let snapshot = model.pendingSnapshot {
                    Section {
                        Button {
                            model.resumePendingSnapshot()
                        } label: {
                            VStack(alignment: .leading) {
                                Text("resume_title").font(.headline)
                                Text(snapshot.workout.name).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Button("discard", role: .destructive) {
                            model.discardPendingSnapshot()
                        }
                    }
                }

                if store.workouts.isEmpty {
                    Text("empty_list")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(store.workouts, id: \.name) { workout in
                        Button {
                            model.start(workout: workout)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(workout.name).font(.headline)
                                Text("exercises_count \(workout.exercises.count)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Tap Next")
            .navigationDestination(isPresented: $model.isActive) {
                SessionView()
            }
        }
    }
}
