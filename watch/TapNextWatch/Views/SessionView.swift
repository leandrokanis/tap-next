import SwiftUI
import TapNextEngine

/// Paleta do protótipo "Tap Next — Protótipo v1" (docs/design).
enum Theme {
    static let accent = Color(red: 0x4D / 255, green: 0xA3 / 255, blue: 0xFF / 255)
    static let onAccent = Color(red: 0x06 / 255, green: 0x12 / 255, blue: 0x1F / 255)
    static let warning = Color(red: 0xFF / 255, green: 0xB0 / 255, blue: 0x20 / 255)
    /// Verde do descanso (v2) — distinto do verde de "completa".
    static let restGreen = Color(red: 0x35 / 255, green: 0xD0 / 255, blue: 0xA0 / 255)
    static let textMid = Color(red: 0xA7 / 255, green: 0xAD / 255, blue: 0xBA / 255)
    static let textDim = Color(red: 0x8A / 255, green: 0x91 / 255, blue: 0x9E / 255)
    static let card = Color(red: 0x14 / 255, green: 0x18 / 255, blue: 0x20 / 255)
}

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
                    if phase.type == .leadin {
                        leadinView(state: state, phase: phase)
                    } else if phase.type == .work {
                        workView(state: state, phase: phase)
                    } else {
                        restView(state: state, phase: phase)
                    }
                    cta(state: state, phase: phase)
                }

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

    // MARK: - Count-in (RF-17)

    @ViewBuilder
    private func leadinView(state: EngineState, phase: Phase) -> some View {
        let exercise = state.workout.exercises[phase.exerciseIndex]
        let remaining = SessionEngine.phaseRemaining(state, at: model.now) ?? 0
        let count = max(1, Int(remaining.rounded(.up)))
        VStack(spacing: 4) {
            HStack {
                Text("get_ready")
                    .font(.system(.caption2, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Theme.accent)
                Spacer()
            }
            Text(exercise.name)
                .font(.system(size: 19, weight: .heavy))
                .multilineTextAlignment(.center)
            Text("\(count)")
                .font(.system(size: 64, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.white)
        }
    }

    // MARK: - Execução (3.1)

    @ViewBuilder
    private func workView(state: EngineState, phase: Phase) -> some View {
        let exercise = state.workout.exercises[phase.exerciseIndex]
        VStack(spacing: 4) {
            HStack {
                Text("\(phase.setNumber ?? 0)/\(exercise.sets)")
                    .font(.system(.caption2, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Theme.accent)
                Spacer()
            }
            Text(exercise.name)
                .font(.system(size: 19, weight: .heavy))
                .multilineTextAlignment(.center)
            if exercise.mode == .reps, let reps = exercise.reps {
                Text(prescription(reps: reps, weight: exercise.weight))
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundStyle(Theme.textMid)
            } else if exercise.mode == .time {
                Text("hold")
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundStyle(Theme.textDim)
            }
            Text(clock(state: state, phase: phase))
                .font(.system(size: 54, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.white)
        }
    }

    // MARK: - Descanso + overtime (3.2 / 3.3)

    @ViewBuilder
    private func restView(state: EngineState, phase: Phase) -> some View {
        let overtime = SessionEngine.phaseOvertime(state, at: model.now) ?? 0
        if overtime > 0 {
            overtimeView(state: state)
        } else {
            VStack(spacing: 6) {
                HStack {
                    Text("rest")
                        .font(.system(.caption2, design: .monospaced).weight(.semibold))
                        .foregroundStyle(Theme.restGreen)
                    Spacer()
                }
                // Nome do exercício sempre visível no descanso (v2).
                Text(state.workout.exercises[phase.exerciseIndex].name)
                    .font(.system(size: 15, weight: .heavy))
                    .multilineTextAlignment(.center)
                Text(clock(state: state, phase: phase))
                    .font(.system(size: 46, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Theme.restGreen)

                upcomingEditor(state: state)
            }
        }
    }

    /// Overtime sem contador (v2): o próximo set é o herói — o motor segue
    /// contando por dentro, mas a tela não mostra o tempo extra.
    @ViewBuilder
    private func overtimeView(state: EngineState) -> some View {
        let nextIndex = state.phaseIndex + 1
        VStack(spacing: 8) {
            if nextIndex < state.phases.count, state.phases[nextIndex].type != .rest {
                let nextPhase = state.phases[nextIndex]
                Text(state.workout.exercises[nextPhase.exerciseIndex].name)
                    .font(.system(size: 19, weight: .heavy))
                    .multilineTextAlignment(.center)
            }
            upcomingEditor(state: state)
        }
    }

    /// Ajuste prospectivo do PRÓXIMO set pela Digital Crown (RF-06):
    /// toque alterna o campo focado, a coroa ajusta.
    @ViewBuilder
    private func upcomingEditor(state: EngineState) -> some View {
        let nextIndex = state.phaseIndex + 1
        if nextIndex < state.phases.count {
            let nextPhase = state.phases[nextIndex]
            // leadin e work apontam ambos para a série que vem a seguir.
            if nextPhase.type != .rest {
                let exercise = state.workout.exercises[nextPhase.exerciseIndex]
                VStack(spacing: 4) {
                    Text("next_up_set \(nextPhase.setNumber ?? 0) \(exercise.sets)")
                        .font(.system(.caption2, design: .monospaced).weight(.semibold))
                        .foregroundStyle(Theme.accent)

                    HStack(spacing: 10) {
                        if exercise.mode == .reps {
                            CrownAdjustableValue(
                                label: "reps",
                                value: Double(state.upcomingOverride?.reps ?? exercise.reps ?? 0),
                                step: 1
                            ) { model.setUpcomingOverride(reps: max(0, Int($0))) }
                        }
                        if exercise.mode == .reps || exercise.weight != nil {
                            CrownAdjustableValue(
                                label: "kg",
                                value: state.upcomingOverride?.weight ?? exercise.weight ?? 0,
                                step: 2.5
                            ) { model.setUpcomingOverride(weight: max(0, $0)) }
                        }
                    }
                    .padding(.vertical, 10)
                    .padding(.horizontal, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Theme.card)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(Theme.accent.opacity(0.35), lineWidth: 1)
                            )
                    )

                    Text("crown_hint")
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(Theme.textDim)
                }
                .padding(.top, 4)
            }
        }
    }

    // MARK: - CTA

    @ViewBuilder
    private func cta(state: EngineState, phase: Phase) -> some View {
        let isRest = phase.type == .rest
        let isLeadin = phase.type == .leadin
        let isTimedWork = phase.type == .work && phase.mode == .time
        let secondary = isTimedWork || isLeadin
        Button {
            model.next()
        } label: {
            Text(isRest ? "start_next" : isLeadin ? "leadin_skip" : isTimedWork ? "end_early" : "next")
                .font(.system(size: isRest || isLeadin ? 14 : 16, weight: .heavy))
                .foregroundStyle(secondary ? Theme.textMid : Theme.onAccent)
                .frame(maxWidth: .infinity, minHeight: 52)
        }
        .buttonStyle(.borderedProminent)
        .tint(secondary ? Theme.card : Theme.accent)
    }

    // MARK: - Helpers

    private func clock(state: EngineState, phase: Phase) -> String {
        let seconds: Double
        if phase.duration != nil {
            seconds = SessionEngine.phaseRemaining(state, at: model.now) ?? 0
        } else {
            seconds = SessionEngine.phaseElapsed(state, at: model.now)
        }
        return formatted(seconds: seconds)
    }

    private func formatted(seconds: Double) -> String {
        let total = max(0, Int(seconds))
        return String(format: "%d:%02d", total / 60, total % 60)
    }

    private func prescription(reps: Int, weight: Double?) -> String {
        if let weight {
            return "\(reps) reps · \(weightText(weight)) kg"
        }
        return "\(reps) reps"
    }

    private func weightText(_ weight: Double) -> String {
        weight.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", weight)
            : String(format: "%.1f", weight)
    }
}

/// Valor focável ajustável pela Digital Crown. Toque foca; a coroa soma
/// `step` por passo. O valor exibido segue o estado do motor (override).
private struct CrownAdjustableValue: View {
    let label: LocalizedStringKey
    let value: Double
    let step: Double
    let onChange: (Double) -> Void

    @State private var crown: Double = 0
    @FocusState private var focused: Bool

    var body: some View {
        VStack(spacing: 2) {
            Text(display)
                .font(.system(size: 20, weight: .heavy))
                .monospacedDigit()
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(Theme.textDim)
        }
        .padding(.horizontal, 6)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(focused ? Theme.accent : .clear, lineWidth: 1)
                .padding(-4)
        )
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
        .focusable(true)
        .focused($focused)
        .digitalCrownRotation(
            $crown,
            from: -1000,
            through: 1000,
            by: 1,
            sensitivity: .low,
            isContinuous: false,
            isHapticFeedbackEnabled: true
        )
        .onChange(of: crown) { _, newValue in
            let delta = newValue.rounded()
            guard delta != 0 else { return }
            crown = 0
            onChange(value + delta * step)
        }
    }

    private var display: String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", value)
            : String(format: "%.1f", value)
    }
}
