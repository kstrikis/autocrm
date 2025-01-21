import { CustomerList } from '@/components/customers/CustomerList';
import { logger } from '@/lib/logger';

export default function CustomersPage(): React.ReactElement {
  logger.methodEntry('CustomersPage');

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Customers</h1>
        </div>
        <CustomerList />
      </div>
    </div>
  );
} 