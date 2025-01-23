import { UserList } from '@/components/users/UserList';
import { logger } from '@/lib/logger';

export default function UsersPage(): React.ReactElement {
  logger.methodEntry('UsersPage');

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Users</h1>
        </div>
        <UserList />
      </div>
    </div>
  );
} 