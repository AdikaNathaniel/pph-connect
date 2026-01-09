import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import RateCardForm from '@/components/rate-cards/RateCardForm';

type RateCardRow = {
  id: string;
  locale: string;
  expertTier: string;
  country: string;
  ratePerUnit: number | null;
  ratePerHour: number | null;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'active' | 'inactive';
};

const SAMPLE_RATE_CARDS: RateCardRow[] = [
  {
    id: 'rc-001',
    locale: 'en-US',
    expertTier: 'premium',
    country: 'United States',
    ratePerUnit: 0.42,
    ratePerHour: null,
    currency: 'USD',
    effectiveFrom: '2025-09-01',
    effectiveTo: null,
    status: 'active'
  },
  {
    id: 'rc-002',
    locale: 'en-PH',
    expertTier: 'standard',
    country: 'Philippines',
    ratePerUnit: null,
    ratePerHour: 7.5,
    currency: 'USD',
    effectiveFrom: '2025-08-15',
    effectiveTo: '2025-12-31',
    status: 'active'
  },
  {
    id: 'rc-003',
    locale: 'pt-BR',
    expertTier: 'standard',
    country: 'Brazil',
    ratePerUnit: 0.31,
    ratePerHour: null,
    currency: 'BRL',
    effectiveFrom: '2025-06-01',
    effectiveTo: null,
    status: 'inactive'
  }
];

const formatCurrency = (value: number | null, currency: string) => {
  if (value == null) {
    return '—';
  }
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleDateString();
};

export const RateCardsPage: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<RateCardRow | null>(null);

  const handleCreate = () => {
    setEditingRateCard(null);
    setFormOpen(true);
  };

  const handleEdit = (row: RateCardRow) => {
    setEditingRateCard(row);
    setFormOpen(true);
  };

  return (
    <div data-testid="rate-cards-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rate cards</h1>
          <p className="text-sm text-muted-foreground">
            Manage payable rates by locale, tier, and project requirements.
          </p>
        </div>
        <Button size="sm" onClick={handleCreate}>
          Add Rate Card
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current rate cards</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-testid="rate-cards-table">
            <TableHeader>
              <TableRow>
                <TableHead>Locale</TableHead>
                <TableHead>Expert Tier</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Rate per Unit</TableHead>
                <TableHead className="text-right">Rate per Hour</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_RATE_CARDS.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.locale}</TableCell>
                  <TableCell className="capitalize">{row.expertTier}</TableCell>
                  <TableCell>{row.country}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.ratePerUnit, row.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.ratePerHour, row.currency)}
                  </TableCell>
                  <TableCell>{row.currency}</TableCell>
                  <TableCell>{formatDate(row.effectiveFrom)}</TableCell>
                  <TableCell>{formatDate(row.effectiveTo)}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'active' ? 'default' : 'outline'}>
                      {row.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(row)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm">
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRateCard ? 'Edit rate card' : 'Add rate card'}</DialogTitle>
            <DialogDescription>
              {editingRateCard
                ? 'Update the rate structure for this locale and tier.'
                : 'Create a new rate card for a locale and tier combination.'}
            </DialogDescription>
          </DialogHeader>
          <RateCardForm
            mode={editingRateCard ? 'update' : 'create'}
            rateCardId={editingRateCard?.id}
            initialValues={
              editingRateCard
                ? {
                    locale: editingRateCard.locale,
                    expertTier: editingRateCard.expertTier,
                    country: editingRateCard.country,
                    ratePerUnit: editingRateCard.ratePerUnit?.toString() ?? '',
                    ratePerHour: editingRateCard.ratePerHour?.toString() ?? '',
                    currency: editingRateCard.currency,
                    effectiveFrom: editingRateCard.effectiveFrom,
                    effectiveTo: editingRateCard.effectiveTo ?? ''
                  }
                : undefined
            }
            onSubmit={() => setFormOpen(false)}
            onCancel={() => setFormOpen(false)}
          />
          <DialogFooter className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateCardsPage;
