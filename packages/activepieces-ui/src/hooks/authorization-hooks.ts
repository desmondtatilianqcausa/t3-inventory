import {
  ApEdition,
  ApFlagId,
  Permission,
  PlatformRole,
  isNil,
} from '@activepieces/shared';

import { authenticationApi } from '@/lib/authentication-api';
import { authenticationSession } from '@/lib/authentication-session';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformApi } from '@/lib/platforms-api';
import { useQuery } from '@tanstack/react-query';
import { userHooks } from '@/hooks/user-hooks';

export const useAuthorization = () => {
  const { data: edition } = flagsHooks.useFlag(ApFlagId.EDITION);

  const platformId = authenticationSession.getPlatformId();
  const { data: projectRole, isLoading } = useQuery({
    queryKey: ['project-role', authenticationSession.getProjectId()],
    queryFn: async () => {
      const platform = await platformApi.getCurrentPlatform();
      if (platform.plan.projectRolesEnabled) {
        const projectRole = await authenticationApi.getCurrentProjectRole();
        return projectRole;
      }
      return null;
    },
    retry: false,
    enabled:
      !isNil(edition) && edition !== ApEdition.COMMUNITY && !isNil(platformId),
  });

  const checkAccess = (permission: Permission) => {
    if (isLoading || edition === ApEdition.COMMUNITY) {
      return true;
    }
    return projectRole?.permissions?.includes(permission) ?? true;
  };

  return { checkAccess };
};

export const useShowPlatformAdminDashboard = () => {
  const platformRole = userHooks.getCurrentUserPlatformRole();
  console.log('platformRole', platformRole);
  //TODO: remove this once we have a proper way to check if the user is a platform admin
  return true;
  return platformRole === PlatformRole.ADMIN;
};
