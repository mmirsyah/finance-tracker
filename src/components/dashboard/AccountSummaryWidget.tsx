// src/components/dashboard/AccountSummaryWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/utils';
import { Target, Landmark, Diamond } from 'lucide-react';
import AccountSummarySkeleton from './AccountSummarySkeleton';

interface AccountSummary {
  total: number;
  generic: number;
  goal: number;
  asset: number;
}

interface AccountDetail {
  id: string;
  name: string;
  balance: number;
  type: string;
  // For goal accounts, we'll add target amount and progress
  targetAmount?: number;
  // For asset accounts, we'll store the current value
  currentValue?: number;
}

const AccountSummaryWidget = () => {
  const { accounts, assets, isLoading } = useAppData();
  const [activeTab, setActiveTab] = useState("generic");
  
  const { accountSummary, accountDetails }: { accountSummary: AccountSummary; accountDetails: AccountDetail[] } = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return { 
        accountSummary: { total: 0, generic: 0, goal: 0, asset: 0 },
        accountDetails: []
      };
    }
    
    // Filter out "Modal Awal Aset" accounts
    const filteredAccounts = accounts.filter(account => account.name !== 'Modal Awal Aset');
    
    // Create a map of asset account IDs to their current values
    const assetValueMap = new Map<string, number>();
    if (assets) {
      assets.forEach(asset => {
        assetValueMap.set(asset.account_id, asset.current_value || 0);
      });
    }
    
    // Hitung ringkasan
    const summary = filteredAccounts.reduce((acc, account) => {
      // For asset accounts, use current_value from assets data
      // For other accounts, use balance
      let value = 0;
      if (account.type === 'asset' && assetValueMap.has(account.id)) {
        value = assetValueMap.get(account.id) || 0;
      } else {
        value = account.balance || 0;
      }
      
      switch (account.type) {
        case 'generic':
          acc.generic += value;
          break;
        case 'goal':
          acc.goal += value;
          break;
        case 'asset':
          acc.asset += value;
          break;
      }
      
      return acc;
    }, { total: 0, generic: 0, goal: 0, asset: 0 } as AccountSummary);
    
    // Siapkan detail akun (tanpa "Modal Awal Aset")
    const details = filteredAccounts.map(account => {
      // For asset accounts, use current_value from assets data
      // For other accounts, use balance
      let displayValue = account.balance || 0;
      let currentValue = undefined;
      let targetAmount = undefined;
      
      if (account.type === 'asset' && assetValueMap.has(account.id)) {
        currentValue = assetValueMap.get(account.id) || 0;
        displayValue = currentValue;
      } else if (account.type === 'goal') {
        // For goal accounts, include target amount
        targetAmount = account.target_amount || undefined;
      }
      
      return {
        id: account.id,
        name: account.name,
        balance: displayValue,
        currentValue: currentValue,
        targetAmount: targetAmount,
        type: account.type
      };
    });
    
    return { accountSummary: summary, accountDetails: details };
  }, [accounts, assets]);
  
  // Filter akun berdasarkan tab yang aktif
  const filteredAccounts = useMemo(() => {
    return accountDetails.filter(account => account.type === activeTab);
  }, [accountDetails, activeTab]);
  
  // Hitung total berdasarkan tab yang aktif
  const currentTotal = useMemo(() => {
    if (activeTab === "generic") return accountSummary.generic;
    if (activeTab === "goal") return accountSummary.goal;
    if (activeTab === "asset") return accountSummary.asset;
    return 0;
  }, [activeTab, accountSummary]);
  
  // Show skeleton while loading
  if (isLoading) {
    return <AccountSummarySkeleton />;
  }
  
  // Tab labels and icons
  const tabInfo = {
    generic: { label: "Total Akun Umum", icon: <Landmark className="h-5 w-5" /> },
    goal: { label: "Total Tujuan Finansial", icon: <Target className="h-5 w-5" /> },
    asset: { label: "Total Aset", icon: <Diamond className="h-5 w-5" /> }
  };
  
  // Get icon with tooltip
  const getIconWithTooltip = (type: string) => {
    const iconProps = { className: "h-4 w-4 text-muted-foreground" };
    
    switch (type) {
      case 'generic':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Landmark {...iconProps} />
            </TooltipTrigger>
            <TooltipContent>
              <p>Akun Umum</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'goal':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Target {...iconProps} />
            </TooltipTrigger>
            <TooltipContent>
              <p>Akun Tujuan</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'asset':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Diamond {...iconProps} />
            </TooltipTrigger>
            <TooltipContent>
              <p>Akun Aset</p>
            </TooltipContent>
          </Tooltip>
        );
      default:
        return <Landmark {...iconProps} />;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className ="text-base md:text-lg"> Ringkasan Akun</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dynamic Total Balance based on active tab */}
        <div className="bg-primary text-primary-foreground rounded-lg p-2">
          <div className="text-sm font-medium flex items-center gap-2">
            {tabInfo[activeTab as keyof typeof tabInfo].icon}
            {tabInfo[activeTab as keyof typeof tabInfo].label}
          </div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(currentTotal)}</div>
          <div className="text-xs opacity-80 mt-1">
            {`${filteredAccounts.length} akun`}
          </div>
        </div>
        
        {/* Tabs for Account Types */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generic" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">Umum</span>
            </TabsTrigger>
            <TabsTrigger value="goal" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Tujuan</span>
            </TabsTrigger>
            <TabsTrigger value="asset" className="flex items-center gap-2">
              <Diamond className="h-4 w-4" />
              <span className="hidden sm:inline">Aset</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map(account => (
                  <div key={account.id} className="flex flex-col p-2 hover:bg-muted rounded">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          {getIconWithTooltip(account.type)}
                        </TooltipProvider>
                        <span className="text-sm">{account.name}</span>
                      </div>
                      <span className={`text-sm font-medium ${account.balance < 0 ? 'text-destructive' : ''}`}>
                        {formatCurrency(account.balance)}
                      </span>
                    </div>
                    
                    {/* Progress bar for goal accounts */}
                    {account.type === 'goal' && account.targetAmount && account.targetAmount > 0 && (
                      <div className="mt-2">
                        <Progress 
                          value={Math.min((account.balance / account.targetAmount) * 100, 100)} 
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{Math.round((account.balance / account.targetAmount) * 100)}%</span>
                          <span>Target: {formatCurrency(account.targetAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Tidak ada akun ditemukan
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AccountSummaryWidget;