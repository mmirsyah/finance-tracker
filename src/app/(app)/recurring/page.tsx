// src/app/(app)/recurring/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppData } from '@/contexts/AppDataContext';
import { RecurringTemplate, RecurringInstance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Play, Pause, Calendar, RefreshCw, List } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import * as recurringService from '@/lib/recurringService';
import RecurringTemplateModal from '@/components/modals/RecurringTemplateModal';
import RecurringCalendar from '@/components/recurring/RecurringCalendar';
import RecurringConfirmModal from '@/components/modals/RecurringConfirmModal';

export default function RecurringPage() {
  const searchParams = useSearchParams();
  const { isLoading, accounts, categories, householdId, refetchData } = useAppData();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [instances, setInstances] = useState<RecurringInstance[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [confirmingInstance, setConfirmingInstance] = useState<RecurringInstance | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingInstances, setIsLoadingInstances] = useState(true);
  const [isGeneratingInstances, setIsGeneratingInstances] = useState(false);

  // Get initial tab from URL parameter
  const initialTab = searchParams?.get('tab') || 'templates';
  const [activeTab, setActiveTab] = useState(initialTab);

  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      // Fetch all templates (active and inactive) so we can see paused ones
      const data = await recurringService.getRecurringTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load recurring templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const fetchInstances = async () => {
    try {
      setIsLoadingInstances(true);
      // Fetch instances for next 60 days
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const data = await recurringService.getRecurringInstances(startDate, endDate);
      setInstances(data);
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast.error('Failed to load recurring instances');
    } finally {
      setIsLoadingInstances(false);
    }
  };

  const generateInstances = async () => {
    if (!householdId) return;
    
    try {
      setIsGeneratingInstances(true);
      const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const count = await recurringService.generateRecurringInstances(householdId, endDate);
      toast.success(`Generated ${count} new instances`);
      fetchInstances(); // Refresh instances
    } catch (error) {
      console.error('Error generating instances:', error);
      toast.error('Failed to generate instances');
    } finally {
      setIsGeneratingInstances(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      fetchTemplates();
      fetchInstances();
    }
  }, [isLoading]);

  // Update active tab when URL parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams?.get('tab');
    if (tabFromUrl && (tabFromUrl === 'templates' || tabFromUrl === 'calendar')) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: RecurringTemplate) => {
    setEditingTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleToggleTemplate = async (template: RecurringTemplate) => {
    try {
      await recurringService.toggleRecurringTemplate(template.id, !template.is_active);
      toast.success(`Template ${template.is_active ? 'paused' : 'activated'}`);
      fetchTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleDeleteTemplate = async (template: RecurringTemplate) => {
    const confirmMessage = `Are you sure you want to permanently delete "${template.template_name}"?\n\nThis action cannot be undone and will remove the template completely from the database.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('Attempting to delete template:', template);
      await recurringService.deleteRecurringTemplate(template.id);
      toast.success('Template permanently deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleInstanceClick = (instance: RecurringInstance) => {
    setConfirmingInstance(instance);
    setIsConfirmModalOpen(true);
  };

  const handleInstanceConfirmed = () => {
    setIsConfirmModalOpen(false);
    setConfirmingInstance(null);
    fetchInstances(); // Refresh instances
    refetchData(); // Refresh app data to update account balances
  };

  const getFrequencyText = (frequency: string, interval: number) => {
    const base = frequency.charAt(0).toUpperCase() + frequency.slice(1);
    return interval === 1 ? base : `Every ${interval} ${base}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-100 text-green-800';
      case 'expense': return 'bg-red-100 text-red-800';
      case 'transfer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={`loading-skeleton-${i}`} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recurring Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola transaksi berulang Anda</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={generateInstances} 
            variant="outline" 
            disabled={isGeneratingInstances}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={isGeneratingInstances ? 'animate-spin' : ''} />
            {isGeneratingInstances ? 'Generating...' : 'Generate Instances'}
          </Button>
          <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
            <Plus size={20} />
            New Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <List size={16} />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar size={16} />
            Calendar ({instances.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          {isLoadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={`template-skeleton-${i}`} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recurring templates yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first recurring template to automate your regular transactions
                </p>
                <Button onClick={handleCreateTemplate} className="flex items-center gap-2 mx-auto">
                  <Plus size={20} />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className={`${!template.is_active ? 'opacity-60 border-dashed' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{template.template_name}</CardTitle>
                          {!template.is_active && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Paused
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getTypeColor(template.type)}>
                            {template.type}
                          </Badge>
                          <Badge variant="outline">
                            {getFrequencyText(template.frequency, template.interval_value)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleTemplate(template)}
                          className="h-8 w-8 p-0"
                          title={template.is_active ? 'Pause template' : 'Activate template'}
                        >
                          {template.is_active ? <Pause size={16} /> : <Play size={16} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                          className="h-8 w-8 p-0"
                          title="Edit template"
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          title="Delete template permanently"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium">{formatCurrency(template.amount)}</span>
                      </div>
                      
                      {template.category_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Category:</span>
                          <span>{template.category_name}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account:</span>
                        <span>{template.account_name}</span>
                      </div>
                      
                      {template.to_account_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">To Account:</span>
                          <span>{template.to_account_name}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Next Due:</span>
                        <span className={!template.is_active ? 'text-gray-400' : ''}>
                          {template.is_active ? new Date(template.next_due_date).toLocaleDateString() : 'Paused'}
                        </span>
                      </div>
                      
                      {template.note && (
                        <div className="pt-2 border-t">
                          <p className="text-gray-600 text-xs">{template.note}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <RecurringCalendar 
            instances={instances}
            isLoading={isLoadingInstances}
            onRefresh={fetchInstances}
            onInstanceClick={handleInstanceClick}
          />
        </TabsContent>
      </Tabs>

      <RecurringTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={() => {
          fetchTemplates();
          setIsTemplateModalOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        accounts={accounts}
        categories={categories}
      />

      <RecurringConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setConfirmingInstance(null);
        }}
        onConfirm={handleInstanceConfirmed}
        instance={confirmingInstance}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}