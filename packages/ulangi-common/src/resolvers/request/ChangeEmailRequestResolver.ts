/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import * as Joi from 'joi';

import { ChangeEmailRequest } from '../../interfaces/request/ChangeEmailRequest';
import { RequestResolver } from './RequestResolver';

export class ChangeEmailRequestResolver extends RequestResolver<
  ChangeEmailRequest
> {
  protected rules = {
    query: Joi.strip(),
    body: {
      password: Joi.string(),
      newEmail: Joi.string().email(),
    },
  };
}
