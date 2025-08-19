// src/components/OnboardingGuide.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle } from 'lucide-react';

interface OnboardingGuideProps {
    hasAccounts: boolean;
    hasCategories: boolean;
}

export default function OnboardingGuide({ hasAccounts, hasCategories }: OnboardingGuideProps) {
    const steps = [
        {
            title: "1. Tambah Akun",
            description: "Buat akun pertama Anda seperti rekening bank, dompet digital, atau uang tunai.",
            isComplete: hasAccounts,
            href: "/accounts?action=new",
            cta: "Tambah Akun"
        },
        {
            title: "2. Buat Kategori",
            description: "Kelompokkan transaksi Anda dengan membuat kategori seperti 'Makan', 'Transportasi', atau 'Gaji'.",
            isComplete: hasCategories,
            href: "/categories",
            cta: "Buat Kategori"
        },
        {
            title: "3. Catat Transaksi",
            description: "Mulai catat pemasukan dan pengeluaran pertama Anda untuk melihat laporannya.",
            isComplete: false,
            href: "/transactions?action=new",
            cta: "Catat Transaksi"
        }
    ];

    return (
        <div className="p-6">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl">Selamat Datang di Aplikasi Keuangan Anda!</CardTitle>
                    <CardDescription>Ikuti langkah-langkah berikut untuk memulai.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {steps.map((step, index) => (
                            <li key={index} className="flex items-start gap-4">
                                <div>
                                    {step.isComplete ? (
                                        <CheckCircle className="h-6 w-6 text-green-500" />
                                    ) : (
                                        <Circle className="h-6 w-6 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold">{step.title}</h3>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                    {!step.isComplete && (
                                        <Button asChild size="sm" className="mt-2">
                                            <Link href={step.href}>{step.cta}</Link>
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}