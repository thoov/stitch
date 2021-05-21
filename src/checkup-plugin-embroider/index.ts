import { RegistrationArgs, getPluginName } from '@checkup/core';

export function register(args: RegistrationArgs): void {
  const pluginName = getPluginName(__dirname);
}
