// swift-tools-version:5.9
import PackageDescription

// Pure session engine consumed by the watchOS app. No UI frameworks —
// mirrors src/engine/ (TypeScript) and is held to the same shared fixtures
// in fixtures/engine/ (ADR 0002). `swift test` runs on macOS and Linux.
let package = Package(
    name: "TapNextEngine",
    products: [
        .library(name: "TapNextEngine", targets: ["TapNextEngine"])
    ],
    targets: [
        .target(name: "TapNextEngine"),
        .testTarget(name: "TapNextEngineTests", dependencies: ["TapNextEngine"]),
    ]
)
