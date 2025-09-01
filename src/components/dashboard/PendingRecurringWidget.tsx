// src/components/dashboard/PendingRecurringWidget.tsx
"use client";

import { useState, useEffect } from 'react';
import { RecurringInstance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import * as recurringService from '@/lib/recurringService';
import Link from 'next/link';

interface PendingRecurringWidgetProps {
  onInstanceClick?: (instance: RecurringInstance) => void;
}

export default function PendingRecurringWidget({ onInstanceClick }: PendingRecurringWidgetProps) {
  const [pendingInstances, setPendingInstances] = useState<RecurringInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingInstances = async () => {
    try {
      setIsLoading(true);
      // Fetch instances for next 30 days, only upcoming and overdue
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days ago
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ahead
      
      const allInstances = await recurringService.getRecurringInstances(startDate, endDate);
      
      // Filter only pending instances (upcoming and overdue)
      const pending = allInstances.filter(instance => 
        instance.status === 'upcoming' || instance.status === 'overdue'
      );
      
      // Sort by due date (overdue first, then by date)
      pending.sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
      
      setPendingInstances(pending.slice(0, 5)); // Show max 5 items
    } catch (error) {
      console.error('Error fetching pending instances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInstances();
  }, []);

  const handleInstanceClick = (instance: RecurringInstance) => {
    if (onInstanceClick) {
      onInstanceClick(instance);
    }
  };

  const getStatusIcon = (status: string, dueDate: string) => {
    if (status === 'overdue') {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    } else if (diffDays <= 3) {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    } else {
      return <Calendar className="w-4 h-4 text-primary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'upcoming': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600';
      case 'expense': return 'text-destructive';
      case 'transfer': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const formatDueDate = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return due.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pending Confirmations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingInstances.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pending Confirmations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-secondary mx-auto mb-3" />
            <p className="text-gray-600 mb-2">All caught up!</p>
            <p className="text-sm text-gray-500">No pending recurring transactions to confirm.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pending Confirmations
            <Badge variant="outline" className="ml-2">
              {pendingInstances.length}
            </Badge>
          </CardTitle>
          <Link href="/recurring?tab=calendar">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingInstances.map((instance) => (
            <div
              key={instance.instance_id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                {getStatusIcon(instance.status, instance.due_date)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">
                    {instance.template_name}
                  </p>
                  <Badge className={`text-xs ${getStatusColor(instance.status)}`}>
                    {instance.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{formatDueDate(instance.due_date)}</span>
                  <span>•</span>
                  <span className={getTypeColor(instance.transaction_type)}>
                    {formatCurrency(instance.original_amount)}
                  </span>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => handleInstanceClick(instance)}>
                  Confirm
                </Button>
              </div>
            </div>
          ))}
          
          {pendingInstances.length >= 5 && (
            <div className="text-center pt-2">
              <Link href="/recurring?tab=calendar">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                  View All Pending
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}