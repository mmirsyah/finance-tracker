"use client";

import { Input } from '@/components/ui/input';

interface AssetFieldsProps {
    quantity: string;
    setQuantity: (val: string) => void;
    price: string;
    setPrice: (val: string) => void;
    amount: string;
}

export function AssetFields({ quantity, setQuantity, price, setPrice, amount }: AssetFieldsProps) {
    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 1.5" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Unit</label>
                <Input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g., 1,000,000" required />
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <Input type="number" value={amount} placeholder="0" required disabled className="bg-muted" />
            </div>
        </>
    )
}
