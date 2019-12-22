/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import { ScreenName } from '@ulangi/ulangi-common/enums';
import * as _ from 'lodash';

import { Images } from '../../constants/Images';
import { config } from '../../constants/config';
import { ContactUsScreenIds } from '../../constants/ids/ContactUsScreenIds';
import { SecondaryScreenStyle } from '../../styles/SecondaryScreenStyle';
import { customTitle } from '../common/CustomTitle';

export class ContactUsScreenStyle {
  public static SCREEN_BASE_STYLES_ONLY = _.merge(
    {},
    SecondaryScreenStyle.SCREEN_BASE_STYLES_ONLY,
    {
      topBar: {
        testID: ContactUsScreenIds.TOP_BAR,
        title: customTitle(ScreenName.CONTACT_US_SCREEN),
      },
    }
  );

  public static SCREEN_LIGHT_STYLES_ONLY = _.merge(
    {},
    SecondaryScreenStyle.SCREEN_LIGHT_STYLES_ONLY,
    {
      topBar: {
        rightButtons: [
          {
            testID: ContactUsScreenIds.SEND_BTN,
            text: 'Send',
            id: ContactUsScreenIds.SEND_BTN,
            disableIconTint: true,
            color: config.styles.primaryColor,
          },
        ],
        leftButtons: [
          {
            testID: ContactUsScreenIds.BACK_BTN,
            icon: Images.ARROW_LEFT_BLACK_22X22,
            id: ContactUsScreenIds.BACK_BTN,
            disableIconTint: true,
            color: config.styles.light.primaryTextColor,
          },
        ],
      },
    }
  );

  public static SCREEN_DARK_STYLES_ONLY = _.merge(
    {},
    SecondaryScreenStyle.SCREEN_DARK_STYLES_ONLY,
    {
      topBar: {
        rightButtons: [
          {
            testID: ContactUsScreenIds.SEND_BTN,
            text: 'Send',
            id: ContactUsScreenIds.SEND_BTN,
            disableIconTint: true,
            color: config.styles.primaryColor,
          },
        ],
        leftButtons: [
          {
            testID: ContactUsScreenIds.BACK_BTN,
            icon: Images.ARROW_LEFT_MILK_22X22,
            id: ContactUsScreenIds.BACK_BTN,
            disableIconTint: true,
            color: config.styles.dark.primaryTextColor,
          },
        ],
      },
    }
  );

  public static SCREEN_FULL_LIGHT_STYLES = _.merge(
    {},
    ContactUsScreenStyle.SCREEN_BASE_STYLES_ONLY,
    ContactUsScreenStyle.SCREEN_LIGHT_STYLES_ONLY
  );

  public static SCREEN_FULL_DARK_STYLES = _.merge(
    {},
    ContactUsScreenStyle.SCREEN_BASE_STYLES_ONLY,
    ContactUsScreenStyle.SCREEN_DARK_STYLES_ONLY
  );
}
