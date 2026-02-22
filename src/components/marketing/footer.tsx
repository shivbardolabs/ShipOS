import Link from 'next/link';

const footerLinks = [
  {
    title: 'Products',
    links: [
      { label: 'ShipOS', href: '/products/shipos' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Customers', href: '/customers' },
      { label: 'Support', href: '/support' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-surface-700/60 bg-surface-950">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shipos-logo-mark.svg" alt="ShipOS" width={28} height={28} />
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold text-surface-100">Ship</span>
                <span className="text-base font-bold text-primary-500">OS</span>
              </div>
            </div>
            <p className="text-xs text-surface-500 leading-relaxed max-w-[200px]">
              Modern postal store management platform built by Bardo Labs.
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-surface-500 hover:text-surface-200 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-surface-800 flex items-center justify-between text-xs text-surface-600">
          <span>&copy; {new Date().getFullYear()} Bardo Labs. All rights reserved.</span>
          <span>ShipOS v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
