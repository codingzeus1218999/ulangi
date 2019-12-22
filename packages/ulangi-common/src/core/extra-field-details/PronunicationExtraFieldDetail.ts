/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import * as Joi from 'joi';

import { ExtraFieldDetail } from './ExtraFieldDetail';

export class PronunciationExtraFieldDetail extends ExtraFieldDetail {
  public readonly name = 'Pronunciation';
  public readonly description = 'Custom pronunciation of the term';
  public readonly kind = 'term';
  public readonly targetLanguageCodes = 'any';
  public readonly parseDirection = 'right';
  public readonly templateName = 'pronunciation';

  public readonly params = [
    {
      description: 'text',
      rule: Joi.string().required(),
      isSpeakable: false,
    },
  ];

  public readonly shortcodes = [
    {
      value: '[pronunciation: ]',
      cursor: 16,
    },
  ];
}
