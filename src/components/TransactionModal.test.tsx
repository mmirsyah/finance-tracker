import { render, screen, fireEvent } from '@testing-library/react';
import TransactionModal from './TransactionModal';
import { useMediaQuery } from '@/hooks/use-media-query';

// Mock the useMediaQuery hook
jest.mock('@/hooks/use-media-query');
const mockedUseMediaQuery = useMediaQuery as jest.Mock;

// Mock child components that are complex or irrelevant to the logic being tested
jest.mock('./CategoryCombobox', () => ({
    CategoryCombobox: ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
        <input data-testid="category-combobox" value={value} onChange={(e) => onChange(e.target.value)} />
    ),
}));

describe('TransactionModal', () => {
    const mockProps = {
        isOpen: true,
        onClose: jest.fn(),
        onSave: jest.fn(),
        editId: null,
        isSaving: false,
        type: 'expense' as const,
        setType: jest.fn(),
        amount: '100',
        setAmount: jest.fn(),
        category: '1',
        setCategory: jest.fn(),
        accountId: '1',
        setAccountId: jest.fn(),
        toAccountId: '',
        setToAccountId: jest.fn(),
        note: 'Test Note',
        setNote: jest.fn(),
        date: '2025-08-28',
        setDate: jest.fn(),
        categories: [{ id: 1, name: 'Food', type: 'expense', household_id: '1', is_archived: false }],
        accounts: [{ id: 1, name: 'Cash', type: 'cash', balance: 1000, user_id: '1', household_id: '1' }],
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders Dialog for desktop view', () => {
        mockedUseMediaQuery.mockReturnValue(true); // isDesktop = true
        render(<TransactionModal {...mockProps} />);
        // Check for a title that exists in the Dialog version
        expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
        // Ensure mobile-specific elements are not present
        expect(screen.queryByText('Step 1 of 2: Enter the details.')).not.toBeInTheDocument();
    });

    it('renders Drawer with Step 1 for mobile view', () => {
        mockedUseMediaQuery.mockReturnValue(false); // isDesktop = false
        render(<TransactionModal {...mockProps} />);
        // Check for mobile-specific title and elements
        expect(screen.getByText('Step 1 of 2: Enter the details.')).toBeInTheDocument();
        expect(screen.getByLabelText('Amount')).toBeInTheDocument();
        expect(screen.getByText('Continue')).toBeInTheDocument();
        // Ensure Step 2 elements are not present
        expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
    });

    it('navigates to Step 2 on mobile when Continue is clicked', () => {
        mockedUseMediaQuery.mockReturnValue(false);
        render(<TransactionModal {...mockProps} />);

        // Initial state: on Step 1
        expect(screen.getByText('Step 1 of 2: Enter the details.')).toBeInTheDocument();

        // Click continue
        const continueButton = screen.getByText('Continue');
        fireEvent.click(continueButton);

        // New state: on Step 2
        expect(screen.getByText('Step 2 of 2: Enter the details.')).toBeInTheDocument();
        // Find the category input via its test id, as it's a custom component
        expect(screen.getByTestId('category-combobox')).toBeInTheDocument();
        expect(screen.getByText('Save Transaction')).toBeInTheDocument();
        expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('navigates back to Step 1 from Step 2 on mobile', () => {
        mockedUseMediaQuery.mockReturnValue(false);
        render(<TransactionModal {...mockProps} />);

        // Go to step 2
        fireEvent.click(screen.getByText('Continue'));
        expect(screen.getByText('Step 2 of 2: Enter the details.')).toBeInTheDocument();

        // Go back
        const backButton = screen.getByText('Back');
        fireEvent.click(backButton);

        // Should be back on Step 1
        expect(screen.getByText('Step 1 of 2: Enter the details.')).toBeInTheDocument();
        expect(screen.getByText('Continue')).toBeInTheDocument();
    });
});
