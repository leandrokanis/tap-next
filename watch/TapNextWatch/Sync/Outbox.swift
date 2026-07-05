import Foundation
import TapNextEngine

/// Disk-backed queue of finished sessions awaiting delivery to the iPhone
/// (ADR 0005). A file is only removed when WatchConnectivity confirms the
/// transfer, so sessions survive crashes, reboots and long separations.
/// Replayed deliveries are harmless: the iPhone insert is idempotent by id.
enum Outbox {
    private static var directory: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("outbox", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static func enqueue(_ record: SessionRecord) {
        guard let data = try? JSONEncoder().encode(record) else { return }
        try? data.write(to: directory.appendingPathComponent("\(record.id).json"), options: .atomic)
    }

    static func pending() -> [SessionRecord] {
        let decoder = JSONDecoder()
        let files = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
        return files
            .filter { $0.pathExtension == "json" }
            .compactMap { try? decoder.decode(SessionRecord.self, from: Data(contentsOf: $0)) }
    }

    static func remove(id: String) {
        try? FileManager.default.removeItem(at: directory.appendingPathComponent("\(id).json"))
    }
}
