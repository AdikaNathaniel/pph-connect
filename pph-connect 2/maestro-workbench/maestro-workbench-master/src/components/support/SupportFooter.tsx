import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const supportLinks = [
  { label: 'Help Center', description: 'Browse documentation and FAQs.', href: '/help' },
  { label: 'Contact Support', description: 'Open a ticket for the support team.', href: '/support/tickets' },
  { label: 'Report Issue', description: 'Submit an anonymous hotline report.', href: '/report' },
];

export const SupportFooter: React.FC = () => {
  return (
    <footer
      className="border-t bg-muted/20 px-4 py-4 text-sm text-muted-foreground"
      data-testid="support-footer"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-foreground">Need help?</p>
          <p className="text-xs text-muted-foreground">
            Support resources are available 24/7. Choose one of the options below to get answers quickly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {supportLinks.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="outline"
              size="sm"
              className="flex flex-col items-start"
            >
              <Link to={link.href}>
                <span className="text-foreground">{link.label}</span>
                <span className="text-[11px] text-muted-foreground">{link.description}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default SupportFooter;
