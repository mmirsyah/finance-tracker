'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUp, ArrowDown, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useAppData } from '@/contexts/AppDataContext';
import { Transaction } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PullToRefreshWrapper from '@/components/PullToRefreshWrapper';

const getTransactionIcon = (type: string) => {
  const iconClass = "w-6 h-6 p-1 rounded-full";
  if (type === 'income') return <ArrowUp className={`${iconClass} text-secondary bg-secondary/10`} />;
  if (type === 'expense') return <ArrowDown className={`${iconClass} text-destructive bg-destructive/10`} />;
  if (type === 'transfer') return <ArrowRightLeft className={`${iconClass} text-muted-foreground bg-muted`} />;
  return <ArrowRight className={iconClass} />;
};

const getAmountColor = (type: string) => {
  if (type === 'income') return 'text-secondary';
  if (type === 'expense') return 'text-destructive';
  return 'text-muted-foreground';
};

export default function RecentTransactions() {
  const { transactions, handleOpenModalForEdit, refetchData } = useAppData();

  const recentTransactions = (transactions || []).slice(0, 7);

  return (
    <PullToRefreshWrapper onRefresh={refetchData}>
      <Card>
        <CardHeader className="section-gap-small">
          <div className="flex justify-between items-center">
              <div>
                  <CardTitle className="text-lg">Recent Transactions</CardTitle>
                  <CardDescription className="muted">Your last 7 transactions.</CardDescription>
              </div>
              <Link href="/transactions">
                  <Button variant="link" size="sm" className="text-primary">View All <ArrowRight className="w-4 h-4 ml-1"/></Button>
              </Link>
          </div>
        </CardHeader>
        <CardContent className="content-gap-small">
          {recentTransactions.length > 0 ? (
            <ul className="space-y-consistent">
              {recentTransactions.map((t: Transaction) => (
                <li 
                    key={t.id} 
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleOpenModalForEdit(t)}
                >
                  {getTransactionIcon(t.type)}
                  <div className="flex-grow">
                    <p className="font-medium text-foreground truncate">{t.note || t.categories?.name || 'Transfer'}</p>
                    <p className="text-sm text-muted-foreground">{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</p>
                  </div>
                  <p className={cn("font-semibold", getAmountColor(t.type))}>
                    {formatCurrency(t.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p className="muted">No recent transactions found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PullToRefreshWrapper>
  );
}
