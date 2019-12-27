/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import { ScreenName } from '@ulangi/ulangi-common/enums';
import * as _ from 'lodash';

import { MoreScreenIds } from '../../constants/ids/MoreScreenIds';
import { PrimaryScreenStyle } from '../../styles/PrimaryScreenStyle';
import { useCustomTopBar } from '../../utils/useCustomTopBar';

export class MoreScreenStyle {
  public static SCREEN_BASE_STYLES_ONLY = _.merge(
    {},
    PrimaryScreenStyle.SCREEN_BASE_STYLES_ONLY,
    {
      topBar: useCustomTopBar({
        testID: MoreScreenIds.TOP_BAR,
        screenName: ScreenName.MORE_SCREEN,
        styles: {
          light: PrimaryScreenStyle.TOP_BAR_LIGHT_STYLES,
          dark: PrimaryScreenStyle.TOP_BAR_DARK_STYLES,
        },
      }),
    },
  );

  public static SCREEN_LIGHT_STYLES_ONLY = _.merge(
    {},
    PrimaryScreenStyle.SCREEN_LIGHT_STYLES_ONLY,
    {},
  );

  public static SCREEN_DARK_STYLES_ONLY = _.merge(
    {},
    PrimaryScreenStyle.SCREEN_DARK_STYLES_ONLY,
    {},
  );

  public static SCREEN_FULL_LIGHT_STYLES = _.merge(
    {},
    MoreScreenStyle.SCREEN_BASE_STYLES_ONLY,
    MoreScreenStyle.SCREEN_LIGHT_STYLES_ONLY,
  );

  public static SCREEN_FULL_DARK_STYLES = _.merge(
    {},
    MoreScreenStyle.SCREEN_BASE_STYLES_ONLY,
    MoreScreenStyle.SCREEN_DARK_STYLES_ONLY,
  );
}
