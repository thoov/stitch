import { RegistrationArgs } from '@checkup/core';
import DependencyCheck from './tasks/dependency-check-task';
import EyeglassModulesCheck from './tasks/eyeglass-modules-task';

export function register(args: RegistrationArgs): void {
  const pluginName = 'checkup-plugin-embroider';

  args.register.task(new DependencyCheck(pluginName, args.context));
  args.register.task(new EyeglassModulesCheck(pluginName, args.context));
}
