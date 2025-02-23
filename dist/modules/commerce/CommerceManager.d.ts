import { CommerceModule } from '../../core/types';
import { NostrCommerce } from '../../core/NostrCommerce';
export declare class CommerceManager implements CommerceModule {
    private framework;
    private invoices;
    constructor(framework: NostrCommerce);
    /**
     * Create a new invoice for payment
     */
    createInvoice(amount: number, description: string): Promise<string>;
    /**
     * Process a tip to a recipient
     */
    processTip(recipient: string, amount: number): Promise<string>;
    /**
     * Verify if a payment has been received
     */
    verifyPayment(invoiceId: string): Promise<boolean>;
    /**
     * Set up listener for incoming payments
     */
    private setupPaymentListener;
    /**
     * Clean up resources
     */
    cleanup(): void;
}
