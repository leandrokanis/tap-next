import SwiftUI
import TapNextEngine

/// Paleta do protótipo "Tap Next — Protótipo v1" (docs/design).
enum Theme {
    static let accent = Color(red: 0x4D / 255, green: 0xA3 / 255, blue: 0xFF / 255)
    static let onAccent = Color(red: 0x06 / 255, green: 0x12 / 255, blue: 0x1F / 255)
    static let warning = Color(red: 0xFF / 255, green: 0xB0 / 255, blue: 0x20 / 255)
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
                    switch phase.type {
                    case .prepare: prepareView(state: state, phase: phase)
                    case .work: workView(state: state, phase: phase)
                    case .rest: restView(state: state, phase: phase)
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

    // MARK: - Preparação (3.1 / 3.5 — RF-19)

    @ViewBuilder
    private func prepareView(state: EngineState, phase: Phase) -> some View {
        let exercise = state.workout.exercises[phase.exerciseIndex]
        let overtime = SessionEngine.phaseOvertime(state, at: model.now) ?? 0
        VStack(spacing: 4) {
            HStack {
                Text("preparation")
                    .font(.system(.caption2, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Theme.accent)
                Spacer()
                if overtime > 0 {
                    Text("+" + formatted(seconds: overtime))
                        .font(.system(.caption2, design: .monospaced).weight(.bold))
                        .monospacedDigit()
                        .foregroundStyle(Theme.warning)
                }
            }
            Text(exercise.name)
                .font(.system(size: 19, weight: .heavy))
                .multilineTextAlignment(.center)
            upcomingEditor(state: state)
        }
    }

    // MARK: - Execução (3.2 / 3.3)

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
            let countdown = SessionEngine.countdownRemaining(state, at: model.now) ?? 0
            if countdown > 0 {
                Text(String(Int(countdown.rounded(.up))))
                    .font(.system(size: 54, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Theme.accent)
                Text("get_ready")
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundStyle(Theme.textDim)
            } else {
                Text(clock(state: state, phase: phase))
                    .font(.system(size: 54, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(.white)
            }
        }
    }

    // MARK: - Descanso + overtime (3.2 / 3.3)

    @ViewBuilder
    private func restView(state: EngineState, phase: Phase) -> some View {
        VStack(spacing: 6) {
            HStack {
                Text("rest")
                    .font(.system(.caption2, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Theme.accent)
                Spacer()
            }
            Text(clock(state: state, phase: phase))
                .font(.system(size: 46, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Theme.accent)
            Text("rest_zero_opens")
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(Theme.textDim)
                .multilineTextAlignment(.center)
        }
    }

    /// Ajuste da série por vir pela Digital Crown (RF-06), na Preparação:
    /// toque alterna o campo focado, a coroa ajusta.
    @ViewBuilder
    private func upcomingEditor(state: EngineState) -> some View {
        let nextIndex = state.phaseIndex + 1
        if nextIndex < state.phases.count {
            let nextPhase = state.phases[nextIndex]
            if nextPhase.type == .work {
                let exercise = state.workout.exercises[nextPhase.exerciseIndex]
                VStack(spacing: 4) {
                    HStack(spacing: 10) {
                        if exercise.mode == .reps {
                            CrownAdjustableValue(
                                label: "reps",
                                value: Double(state.upcomingOverride?.reps ?? exercise.reps ?? 0),
                                step: 1
                            ) { model.setUpcomingOverride(reps: max(0, Int($0))) }
                        } else {
                            CrownAdjustableValue(
                                label: "sec",
                                value: Double(state.upcomingOverride?.duration ?? exercise.duration ?? 0),
                                step: 5
                            ) { model.setUpcomingOverride(duration: max(5, Int($0))) }
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
        let isTimedWork = phase.type == .work && phase.mode == .time
        let label: LocalizedStringKey = switch phase.type {
        case .prepare: "start"
        case .rest: "start_next"
        case .work: isTimedWork ? "end_early" : "next"
        }
        Button {
            model.next()
        } label: {
            Text(label)
                .font(.system(size: phase.type == .rest ? 14 : 16, weight: .heavy))
                .foregroundStyle(isTimedWork ? Theme.textMid : Theme.onAccent)
                .frame(maxWidth: .infinity, minHeight: 52)
        }
        .buttonStyle(.borderedProminent)
        .tint(isTimedWork ? Theme.card : Theme.accent)
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
