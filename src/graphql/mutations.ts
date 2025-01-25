export const updateUserRole = /* GraphQL */ `
  mutation UpdateUserRole($userId: ID!, $role: UserRole!) {
    updateUserRole(userId: $userId, role: $role) {
      id
      fullName
      role
      updatedAt
    }
  }
`;
