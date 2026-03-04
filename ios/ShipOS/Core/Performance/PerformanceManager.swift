import Foundation
import UIKit
import os.signpost
import Combine

// MARK: - BAR-377: Performance Optimization
// Image caching, lazy loading, memory management, response caching,
// signpost profiling, and startup time optimization.

// MARK: - Image Cache

/// Two-tier image cache: in-memory (NSCache) + on-disk (FileManager).
/// Thread-safe, memory-pressure aware, with configurable limits.
actor ImageCache {
    static let shared = ImageCache()

    private let memoryCache = NSCache<NSString, UIImage>()
    private let diskCacheURL: URL
    private let fileManager = FileManager.default
    private let maxDiskSizeMB: Int = 200
    private let maxMemoryCount: Int = 100

    private init() {
        let caches = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        diskCacheURL = caches.appendingPathComponent("ImageCache", isDirectory: true)
        try? fileManager.createDirectory(at: diskCacheURL, withIntermediateDirectories: true)

        memoryCache.countLimit = maxMemoryCount
        memoryCache.totalCostLimit = 50 * 1024 * 1024  // 50 MB

        // Observe memory warnings
        Task { @MainActor in
            NotificationCenter.default.addObserver(
                forName: UIApplication.didReceiveMemoryWarningNotification,
                object: nil,
                queue: .main
            ) { [weak memoryCache] _ in
                memoryCache?.removeAllObjects()
                PerformanceMonitor.shared.log("ImageCache memory purged")
            }
        }
    }

    // MARK: - Public API

    /// Get an image from cache (memory first, then disk).
    func image(for url: URL) -> UIImage? {
        let key = cacheKey(for: url)

        // Check memory
        if let cached = memoryCache.object(forKey: key as NSString) {
            return cached
        }

        // Check disk
        let diskPath = diskURL(for: key)
        guard let data = try? Data(contentsOf: diskPath),
              let image = UIImage(data: data) else {
            return nil
        }

        // Promote to memory cache
        memoryCache.setObject(image, forKey: key as NSString, cost: data.count)
        return image
    }

    /// Store an image in both caches.
    func store(_ image: UIImage, for url: URL) {
        let key = cacheKey(for: url)

        // Memory cache
        if let data = image.pngData() {
            memoryCache.setObject(image, forKey: key as NSString, cost: data.count)

            // Disk cache
            let diskPath = diskURL(for: key)
            try? data.write(to: diskPath)
        }
    }

    /// Download and cache an image.
    func loadImage(from url: URL) async -> UIImage? {
        // Check cache first
        if let cached = image(for: url) {
            return cached
        }

        // Download
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let image = UIImage(data: data) else { return nil }

            store(image, for: url)
            return image
        } catch {
            return nil
        }
    }

    /// Clear all caches.
    func clearAll() {
        memoryCache.removeAllObjects()
        try? fileManager.removeItem(at: diskCacheURL)
        try? fileManager.createDirectory(at: diskCacheURL, withIntermediateDirectories: true)
    }

    /// Get total disk cache size.
    var diskCacheSizeMB: Double {
        guard let contents = try? fileManager.contentsOfDirectory(
            at: diskCacheURL, includingPropertiesForKeys: [.fileSizeKey]
        ) else { return 0 }

        let bytes = contents.compactMap { url -> Int? in
            try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize
        }.reduce(0, +)

        return Double(bytes) / (1024 * 1024)
    }

    /// Evict old entries when over the size limit.
    func evictIfNeeded() {
        guard diskCacheSizeMB > Double(maxDiskSizeMB) else { return }

        guard let contents = try? fileManager.contentsOfDirectory(
            at: diskCacheURL,
            includingPropertiesForKeys: [.contentAccessDateKey, .fileSizeKey]
        ) else { return }

        // Sort by last access date (oldest first)
        let sorted = contents.sorted { a, b in
            let dateA = (try? a.resourceValues(forKeys: [.contentAccessDateKey]).contentAccessDate) ?? .distantPast
            let dateB = (try? b.resourceValues(forKeys: [.contentAccessDateKey]).contentAccessDate) ?? .distantPast
            return dateA < dateB
        }

        // Remove oldest until under limit
        var currentSize = diskCacheSizeMB
        for url in sorted {
            guard currentSize > Double(maxDiskSizeMB) * 0.7 else { break }
            if let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                try? fileManager.removeItem(at: url)
                currentSize -= Double(size) / (1024 * 1024)
            }
        }
    }

    // MARK: - Helpers

    private func cacheKey(for url: URL) -> String {
        DataEncryption.sha256(Data(url.absoluteString.utf8))
    }

    private func diskURL(for key: String) -> URL {
        diskCacheURL.appendingPathComponent(key)
    }
}

// MARK: - API Response Cache

/// Caches API responses with TTL for reducing network calls.
actor ResponseCache {
    static let shared = ResponseCache()

    struct CacheEntry {
        let data: Data
        let timestamp: Date
        let ttl: TimeInterval
    }

    private var cache: [String: CacheEntry] = [:]
    private let maxEntries = 200

    /// Get cached response if still valid.
    func get(for key: String) -> Data? {
        guard let entry = cache[key] else { return nil }

        if Date().timeIntervalSince(entry.timestamp) > entry.ttl {
            cache.removeValue(forKey: key)
            return nil
        }

        return entry.data
    }

    /// Store a response with TTL.
    func set(_ data: Data, for key: String, ttl: TimeInterval = 60) {
        // Evict oldest if at capacity
        if cache.count >= maxEntries {
            let oldest = cache.min { $0.value.timestamp < $1.value.timestamp }
            if let oldest {
                cache.removeValue(forKey: oldest.key)
            }
        }

        cache[key] = CacheEntry(data: data, timestamp: Date(), ttl: ttl)
    }

    /// Invalidate a specific key.
    func invalidate(_ key: String) {
        cache.removeValue(forKey: key)
    }

    /// Invalidate all entries matching a prefix.
    func invalidatePrefix(_ prefix: String) {
        let keys = cache.keys.filter { $0.hasPrefix(prefix) }
        keys.forEach { cache.removeValue(forKey: $0) }
    }

    /// Clear all cached responses.
    func clearAll() {
        cache.removeAll()
    }
}

// MARK: - Performance Monitor

/// Lightweight performance monitoring with os_signpost integration.
@MainActor
final class PerformanceMonitor: ObservableObject {
    static let shared = PerformanceMonitor()

    @Published private(set) var metrics: AppMetrics = .init()

    private let signpostLog = OSLog(subsystem: "ai.bardolabs.shipos", category: "Performance")

    struct AppMetrics {
        var appLaunchTime: TimeInterval = 0
        var screenLoadTimes: [String: TimeInterval] = [:]
        var apiCallDurations: [String: [TimeInterval]] = [:]
        var memoryUsageMB: Double = 0
        var diskCacheSizeMB: Double = 0
    }

    private var signpostIDs: [String: OSSignpostID] = [:]

    // MARK: - Signpost Tracking

    /// Begin a signpost interval.
    func beginInterval(_ name: String) {
        let id = OSSignpostID(log: signpostLog)
        signpostIDs[name] = id
        os_signpost(.begin, log: signpostLog, name: "Performance", signpostID: id, "%{public}s", name)
    }

    /// End a signpost interval and record duration.
    func endInterval(_ name: String) {
        guard let id = signpostIDs.removeValue(forKey: name) else { return }
        os_signpost(.end, log: signpostLog, name: "Performance", signpostID: id, "%{public}s", name)
    }

    // MARK: - Screen Load Tracking

    /// Record the load time for a screen.
    func recordScreenLoad(_ screen: String, duration: TimeInterval) {
        metrics.screenLoadTimes[screen] = duration
        log("Screen '\(screen)' loaded in \(String(format: "%.1f", duration * 1000))ms")
    }

    /// Record an API call duration.
    func recordAPICall(_ endpoint: String, duration: TimeInterval) {
        metrics.apiCallDurations[endpoint, default: []].append(duration)
    }

    // MARK: - Memory

    /// Get current memory usage.
    func updateMemoryUsage() {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }

        if result == KERN_SUCCESS {
            metrics.memoryUsageMB = Double(info.resident_size) / (1024 * 1024)
        }
    }

    // MARK: - Logging

    func log(_ message: String) {
        #if DEBUG
        print("[Perf] \(message)")
        #endif
    }

    // MARK: - Aggregates

    /// Average API call duration for an endpoint.
    func averageAPICallTime(for endpoint: String) -> TimeInterval? {
        guard let durations = metrics.apiCallDurations[endpoint], !durations.isEmpty else { return nil }
        return durations.reduce(0, +) / Double(durations.count)
    }
}

// MARK: - Async Image View (Cached)

import SwiftUI

/// A SwiftUI image view that loads from URL with two-tier caching.
struct CachedAsyncImage<Placeholder: View>: View {
    let url: URL?
    @ViewBuilder let placeholder: () -> Placeholder

    @State private var image: UIImage?
    @State private var isLoading = false

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                placeholder()
                    .overlay {
                        if isLoading {
                            ProgressView()
                                .tint(ShipOSTheme.Colors.textSecondary)
                        }
                    }
            }
        }
        .task(id: url) {
            await loadImage()
        }
    }

    private func loadImage() async {
        guard let url, !isLoading else { return }
        isLoading = true
        image = await ImageCache.shared.loadImage(from: url)
        isLoading = false
    }
}

// MARK: - View Load Timer Modifier

struct ScreenLoadTimerModifier: ViewModifier {
    let screenName: String
    @State private var startTime: Date?

    func body(content: Content) -> some View {
        content
            .onAppear {
                startTime = Date()
            }
            .task {
                // Measure after first layout pass
                try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
                if let start = startTime {
                    let duration = Date().timeIntervalSince(start)
                    await MainActor.run {
                        PerformanceMonitor.shared.recordScreenLoad(screenName, duration: duration)
                    }
                }
            }
    }
}

extension View {
    /// Track screen load time for performance monitoring.
    func trackScreenLoad(_ name: String) -> some View {
        modifier(ScreenLoadTimerModifier(screenName: name))
    }
}

// MARK: - Prefetch Manager

/// Coordinates prefetching of data for list views.
@MainActor
final class PrefetchManager {
    static let shared = PrefetchManager()

    private var prefetchedURLs = Set<URL>()

    /// Prefetch images for a list of URLs.
    func prefetchImages(_ urls: [URL]) {
        let newURLs = urls.filter { !prefetchedURLs.contains($0) }
        guard !newURLs.isEmpty else { return }

        prefetchedURLs.formUnion(newURLs)

        Task.detached(priority: .utility) {
            for url in newURLs {
                _ = await ImageCache.shared.loadImage(from: url)
            }
        }
    }

    /// Clear prefetch tracking.
    func reset() {
        prefetchedURLs.removeAll()
    }
}
