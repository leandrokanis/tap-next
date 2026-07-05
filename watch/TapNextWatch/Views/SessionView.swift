import SwiftUI
import TapNextEngine

struct SessionView: View {
    @EnvironmentObject private var model: SessionViewModel
    @State private var showFinishDialog = false

    var body: some View {
        Group {
            if let state = model.state {
                content(state: state)
            } else {
                ProgressView()
            }
        }
        .navigationBarBackButtonHidden(true)
    }

    @ViewBuilder
    private func content(state: EngineState) -> some View {
        let phase = SessionEngine.currentPhase(state)
        let paused = state.status == .paused

        ScrollView {
            VStack(spacing: 8) {
                if let phase {
                    if phase.type == .work {
                        workView(state: state, phase: phase)
                    } else {
                        restView(state: state, phase: phase)
                    }
                }

                Button {
                    model.next()
                } label: {
                    Text("next")
                        .font(.system(size: 24, weight: .heavy))
                        .frame(maxWidth: .infinity, minHeight: 56)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)

                HStack {
                    Button(paused ? "resume" : "pause") {
                        paused ? model.resume() : model.pause()
                    }
                    .buttonStyle(.bordered)

                    Button("finish", role: .destructive) {
                        showFinishDialog = true
                    }
                    .buttonStyle(.bordered)
                }
                .font(.footnote)
            }
        }
        .confirmationDialog("finish_title", isPresented: $showFinishDialog) {
            Button("finish_save") { model.finishAndSave() }
            Button("finish_discard", role: .destructive) { model.discard() }
            Button("finish_continue", role: .cancel) {}
        }
    }

    @ViewBuilder
    private func workView(state: EngineState, phase: Phase) -> some View {
        let exercise = state.workout.exercises[phase.exerciseIndex]
        VStack(spacing: 4) {
            Text(exercise.name)
                .font(.headline)
                .multilineTextAlignment(.center)
            Text("set_of \(phase.setNumber ?? 0) \(exercise.sets)")
                .font(.caption)
                .foregroundStyle(.secondary)
            if exercise.mode == .reps, let reps = exercise.reps {
                Text(prescription(reps: reps, weight: exercise.weight))
                    .font(.caption)
                    .foregroundStyle(.green)
            }
            Text(clock(state: state, phase: phase))
                .font(.system(size: 40, weight: .heavy, design: .rounded))
                .monospacedDigit()
        }
    }

    @ViewBuilder
    private func restView(state: EngineState, phase: Phase) -> some View {
        VStack(spacing: 4) {
            Text("rest")
                .font(.headline)
                .foregroundStyle(.orange)
            Text(clock(state: state, phase: phase))
                .font(.system(size: 40, weight: .heavy, design: .rounded))
                .monospacedDigit()

            if let last = state.completedSets.last, last.reps != nil || last.weight != nil {
                setEditor(last: last)
            }
        }
    }

    @ViewBuilder
    private func setEditor(last: LoggedSet) -> some View {
        VStack(spacing: 4) {
            Text("set_done \(last.setIndex)")
                .font(.caption2)
                .foregroundStyle(.green)
            if let reps = last.reps {
                adjustRow(label: "reps", value: "\(reps)") { delta in
                    model.updateSet(
                        exerciseIndex: last.exerciseIndex,
                        setIndex: last.setIndex,
                        reps: max(0, reps + Int(delta))
                    )
                }
            }
            if let weight = last.weight {
                adjustRow(label: "kg", value: weightText(weight)) { delta in
                    model.updateSet(
                        exerciseIndex: last.exerciseIndex,
                        setIndex: last.setIndex,
                        weight: max(0, weight + delta * 2.5)
                    )
                }
            }
        }
        .padding(.top, 4)
    }

    private func adjustRow(label: LocalizedStringKey, value: String, adjust: @escaping (Double) -> Void) -> some View {
        HStack {
            Text(label).font(.caption2).foregroundStyle(.secondary)
            Spacer()
            Button("−") { adjust(-1) }.buttonStyle(.bordered).frame(width: 40)
            Text(value).font(.body.weight(.bold)).monospacedDigit()
            Button("+") { adjust(1) }.buttonStyle(.bordered).frame(width: 40)
        }
    }

    private func clock(state: EngineState, phase: Phase) -> String {
        let seconds: Double
        if phase.duration != nil {
            seconds = SessionEngine.phaseRemaining(state, at: model.now) ?? 0
        } else {
            seconds = SessionEngine.phaseElapsed(state, at: model.now)
        }
        let total = max(0, Int(seconds))
        return String(format: "%d:%02d", total / 60, total % 60)
    }

    private func prescription(reps: Int, weight: Double?) -> String {
        if let weight {
            return "\(reps) × \(weightText(weight))"
        }
        return "\(reps)"
    }

    private func weightText(_ weight: Double) -> String {
        weight.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", weight)
            : String(format: "%.1f", weight)
    }
}
