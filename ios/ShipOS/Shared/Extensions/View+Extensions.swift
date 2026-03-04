import SwiftUI

// MARK: - View Modifiers

extension View {
    /// Apply a shadow style from the theme.
    func soShadow(_ style: ShadowStyle) -> some View {
        shadow(color: style.color, radius: style.radius, x: 0, y: style.y)
    }

    /// Conditional modifier.
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }

    /// Show a toast banner.
    func toast(_ message: Binding<ToastMessage?>) -> some View {
        modifier(ToastModifier(message: message))
    }

    /// Haptic feedback on tap.
    func hapticOnTap(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) -> some View {
        simultaneousGesture(
            TapGesture().onEnded {
                UIImpactFeedbackGenerator(style: style).impactOccurred()
            }
        )
    }
}

// MARK: - Toast Modifier

struct ToastModifier: ViewModifier {
    @Binding var message: ToastMessage?

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .top) {
                if let message {
                    SOToastBanner(message: message)
                        .onAppear {
                            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                                withAnimation {
                                    self.message = nil
                                }
                            }
                        }
                }
            }
            .animation(.spring(response: 0.3), value: message)
    }
}

// MARK: - Refreshable Loading State

/// A view model protocol for list views with pagination + refresh.
@MainActor
protocol ListViewModel: ObservableObject {
    associatedtype Item: Identifiable

    var items: [Item] { get }
    var isLoading: Bool { get }
    var error: String? { get }
    var hasMore: Bool { get }

    func load() async
    func loadMore() async
    func refresh() async
}
