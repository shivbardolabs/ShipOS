import {
  Package,
  Users,
  Truck,
  Mail,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ShipOS</h1>
              <p className="text-xs text-surface-400">
                Postal Store Management
              </p>
            </div>
          </div>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-4">
            Your postal store,{" "}
            <span className="gradient-text">fully managed</span>
          </h2>
          <p className="text-lg text-surface-400 mb-12 max-w-2xl mx-auto">
            Package tracking, customer management, shipping, and compliance —
            all in one modern platform designed for postal retail.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Package,
                title: "Package Tracking",
                desc: "Check in, notify, and release packages with full audit trails",
              },
              {
                icon: Users,
                title: "Customer & PMB",
                desc: "Manage mailbox rentals, CMRA compliance, and 1583 forms",
              },
              {
                icon: Truck,
                title: "Shipping Center",
                desc: "Multi-carrier rate shopping with wholesale pricing",
              },
              {
                icon: Mail,
                title: "Mail Handling",
                desc: "Scan, sort, and manage mail with automated notifications",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 text-left card-hover"
              >
                <feature.icon className="w-8 h-8 text-primary-400 mb-3" />
                <h3 className="text-sm font-semibold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-surface-400">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Quick stats preview */}
          <div className="mt-12 glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-accent-emerald" />
              <span className="text-sm font-medium text-surface-300">
                Platform Ready
              </span>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Package Check-in", value: "✓" },
                { label: "Customer Mgmt", value: "✓" },
                { label: "Shipping Center", value: "✓" },
                { label: "Analytics", value: "✓" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold text-accent-emerald">
                    {stat.value}
                  </p>
                  <p className="text-xs text-surface-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-surface-500">
          <span>ShipOS v0.1.0</span>
          <span>Built for modern postal retail</span>
        </div>
      </footer>
    </div>
  );
}
