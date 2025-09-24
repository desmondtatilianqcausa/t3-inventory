import {
  METRIC_TO_LIMIT_MAPPING,
  METRIC_TO_USAGE_MAPPING,
} from '@activepieces/ee-shared';
import {
  PlatformUsageMetric,
  PlatformWithoutSensitiveData,
  isNil,
} from '@activepieces/shared';
import {
  QueryClient,
  useMutation,
  useSuspenseQuery,
} from '@tanstack/react-query';

import { authenticationSession } from '@/lib/authentication-session';
import { flagsHooks } from './flags-hooks';
import { platformApi } from '../lib/platforms-api';
import { t } from 'i18next';
import { toast } from '@/components/ui/use-toast';

export const platformHooks = {
  isCopilotEnabled: () => {
    const { platform } = platformHooks.useCurrentPlatform();
    return Object.keys(platform?.copilotSettings?.providers ?? {}).length > 0;
  },
  useCurrentPlatform: () => {
    const currentPlatformId = authenticationSession.getPlatformId();
    console.log('currentPlatformId', currentPlatformId);
    const query = useSuspenseQuery({
      queryKey: ['platform', currentPlatformId],
      queryFn: platformApi.getCurrentPlatform,
      staleTime: Infinity,
    });
    console.log('query.data', query.data);
    return {
      platform: query.data,
      refetch: async () => {
        await query.refetch();
      },
      setCurrentPlatform: (
        queryClient: QueryClient,
        platform: PlatformWithoutSensitiveData,
      ) => {
        queryClient.setQueryData(['platform', currentPlatformId], platform);
      },
    };
  },
  useUpdateLisenceKey: (queryClient: QueryClient) => {
    const currentPlatformId = authenticationSession.getPlatformId();

    return useMutation({
      mutationFn: async (tempLicenseKey: string) => {
        if (tempLicenseKey.trim() === '') return;
        await platformApi.verifyLicenseKey(tempLicenseKey.trim());
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['platform', currentPlatformId],
        });
        queryClient.invalidateQueries({
          queryKey: flagsHooks.queryKey,
        });
        toast({
          title: t('Success'),
          description: t('License activated successfully!'),
        });
      },
      onError: () => {
        toast({
          title: t('Error'),
          description: t('Activation failed, invalid license key'),
          variant: 'destructive',
        });
      },
    });
  },
  useCheckResourceIsLocked: (
    resource: Exclude<
      PlatformUsageMetric,
      PlatformUsageMetric.AI_CREDITS | PlatformUsageMetric.TASKS
    >,
  ): boolean => {
    const { platform } = platformHooks.useCurrentPlatform();

    const plan = platform.plan;
    const usage = platform.usage;
    if (isNil(usage)) {
      return false;
    }

    const limitKey = METRIC_TO_LIMIT_MAPPING[resource];
    const usageKey = METRIC_TO_USAGE_MAPPING[resource];

    const limit = plan[limitKey];
    const currentUsage = usage[usageKey];

    if (!isNil(limit) && currentUsage > limit) {
      return true;
    }

    return false;
  },
};
