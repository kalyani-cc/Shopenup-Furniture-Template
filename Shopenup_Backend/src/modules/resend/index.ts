import { ModuleProvider, Modules } from '@shopenup/framework/utils';
import ResendNotificationProviderService from './service';

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationProviderService],
});
