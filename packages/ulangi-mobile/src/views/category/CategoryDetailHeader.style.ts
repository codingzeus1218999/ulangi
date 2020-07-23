/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import * as _ from 'lodash';
import { StyleSheet, ViewStyle } from 'react-native';

import { config } from '../../constants/config';

export interface CategoryDetailHeaderStyles {
  container: ViewStyle;
  buttons_container: ViewStyle;
  button_container: ViewStyle;
}

export const baseStyles: CategoryDetailHeaderStyles = {
  container: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },

  buttons_container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  button_container: {
    paddingHorizontal: 6,
  },
};

export const lightStyles = StyleSheet.create(
  _.merge({}, baseStyles, {
    container: {
      borderBottomColor: config.styles.light.primaryBorderColor,
    },

    title: {
      color: config.styles.light.primaryTextColor,
    },
  }),
);

export const darkStyles = StyleSheet.create(
  _.merge({}, baseStyles, {
    container: {
      borderBottomColor: config.styles.dark.primaryBorderColor,
    },
  }),
);
