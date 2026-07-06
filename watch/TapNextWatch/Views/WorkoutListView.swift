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
                                Text("resume_title")
                                    .font(.headline)
                                    .foregroundStyle(Theme.warning)
                                Text(snapshot.workout.name)
                                    .font(.system(.caption, design: .monospaced))
                                    .foregroundStyle(Theme.textDim)
                            }
                        }
                        Button("discard", role: .destructive) {
                            model.discardPendingSnapshot()
                        }
                    }
                }

                if store.workouts.isEmpty {
                    Text("empty_list")
                        .foregroundStyle(Theme.textDim)
                } else {
                    ForEach(store.workouts, id: \.name) { workout in
                        Button {
                            model.start(workout: workout)
                        } label: {
                            VStack(alignment: .leading) {
                                Text(workout.name)
                                    .font(.system(size: 17, weight: .heavy))
                                Text("exercises_count \(workout.exercises.count)")
                                    .font(.system(.caption2, design: .monospaced))
                                    .foregroundStyle(Theme.textDim)
                            }
                        }
                        .listRowBackground(
                            RoundedRectangle(cornerRadius: 14).fill(Theme.card)
                        )
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
