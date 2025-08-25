// src/components/recurring/RecurringCalendar.tsx
"use client";

import { useState } from 'react';
import { RecurringInstance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RecurringCalendarProps {
  instances: RecurringInstance[];
  isLoading: boolean;
  onRefresh: () => void;
  onInstanceClick?: (instance: RecurringInstance) => void;
}

export default function RecurringCalendar({ instances, isLoading, onRefresh, onInstanceClick }: RecurringCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filter instances for current month
  const monthInstances = instances.filter(instance => {
    const instanceDate = new Date(instance.due_date);
    return instanceDate.getMonth() === currentMonth && instanceDate.getFullYear() === currentYear;
  });

  // Group instances by date
  const instancesByDate = monthInstances.reduce((acc, instance) => {
    const date = new Date(instance.due_date).getDate();
    if (!acc[date]) acc[date] = [];
    acc[date].push(instance);
    return acc;
  }, {} as Record<number, RecurringInstance[]>);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'confirmed': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'done_with_difference': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600';
      case 'expense': return 'text-red-600';
      case 'transfer': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Check if date is today
  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  // Check if date is in the past
  const isPast = (day: number) => {
    const today = new Date();
    const checkDate = new Date(currentYear, currentMonth, day);
    return checkDate < today && !isToday(day);
  };

  // Handle instance click
  const handleInstanceClick = (instance: RecurringInstance) => {
    if (onInstanceClick && (instance.status === 'upcoming' || instance.status === 'overdue')) {
      onInstanceClick(instance);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24"></div>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayInstances = instancesByDate[day] || [];
              const hasInstances = dayInstances.length > 0;

              return (
                <div
                  key={day}
                  className={`h-24 p-1 border rounded-lg ${
                    isToday(day) ? 'bg-blue-50 border-blue-200' : 
                    isPast(day) ? 'bg-gray-50' : 'bg-white'
                  } ${hasInstances ? 'border-2' : 'border'}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday(day) ? 'text-blue-600' : 
                    isPast(day) ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {day}
                  </div>
                  
                  <div className="space-y-1 overflow-hidden">
                    {dayInstances.slice(0, 2).map((instance) => (
                      <div
                        key={instance.instance_id}
                        className={`text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(instance.status)} ${
                          instance.status === 'upcoming' || instance.status === 'overdue' ? 'hover:shadow-sm' : ''
                        }`}
                        title={`${instance.template_name} - ${formatCurrency(instance.original_amount)} (${instance.status})`}
                        onClick={() => handleInstanceClick(instance)}
                      >
                        <div className="truncate font-medium">
                          {instance.template_name}
                        </div>
                        <div className={`truncate ${getTypeColor(instance.transaction_type)}`}>
                          {formatCurrency(instance.original_amount)}
                        </div>
                      </div>
                    ))}
                    
                    {dayInstances.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayInstances.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">Upcoming (Clickable)</Badge>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Confirmed</Badge>
            <Badge className="bg-green-100 text-green-800 border-green-200">Done</Badge>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200">Done (Modified)</Badge>
            <Badge className="bg-red-100 text-red-800 border-red-200">Overdue (Clickable)</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Click on upcoming or overdue instances to confirm them as transactions.
          </p>
        </CardContent>
      </Card>

      {/* Summary */}
      {monthInstances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {firstDayOfMonth.toLocaleDateString('en-US', { month: 'long' })} Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {monthInstances.filter(i => i.status === 'upcoming').length}
                </div>
                <div className="text-sm text-gray-600">Upcoming</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {monthInstances.filter(i => i.status === 'overdue').length}
                </div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {monthInstances.filter(i => i.status === 'done' || i.status === 'done_with_difference').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {monthInstances.length}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}