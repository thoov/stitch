import { FormatterArgs } from '@checkup/core';

export type StitchFormatterArgs = Omit<FormatterArgs, 'format' | 'writer'>;
