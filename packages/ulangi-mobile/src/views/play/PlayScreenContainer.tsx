/*
 * Copyright (c) Minh Loi.
 *
 * This file is part of Ulangi which is released under GPL v3.0.
 * See LICENSE or go to https://www.gnu.org/licenses/gpl-3.0.txt
 */

import { Options } from '@ulangi/react-native-navigation';
import { ScreenName, Theme } from '@ulangi/ulangi-common/enums';
import {
  ObservableScreen,
  ObservableTouchableTopBar,
} from '@ulangi/ulangi-observable';
import { observer } from 'mobx-react';
import * as React from 'react';

import { Container, ContainerPassedProps } from '../../Container';
import { PlayScreenIds } from '../../constants/ids/PlayScreenIds';
import { PlayScreenFactory } from '../../factories/play/PlayScreenFactory';
import { LearnScreenStyle } from '../learn/LearnScreenContainer.style';
import { PlayScreen } from './PlayScreen';

@observer
export class PlayScreenContainer extends Container {
  public static options(props: ContainerPassedProps): Options {
    return props.theme === Theme.LIGHT
      ? LearnScreenStyle.SCREEN_FULL_LIGHT_STYLES
      : LearnScreenStyle.SCREEN_FULL_DARK_STYLES;
  }

  private screenFactory = new PlayScreenFactory(
    this.props,
    this.eventBus,
    this.observer,
  );

  private setSelectionMenuDelegate = this.screenFactory.createSetSelectionMenuDelegateWithStyles();

  private navigatorDelegate = this.screenFactory.createNavigatorDelegate();

  protected observableScreen = new ObservableScreen(
    ScreenName.PLAY_SCREEN,
    new ObservableTouchableTopBar(
      PlayScreenIds.SHOW_SET_SELECTION_MENU_BTN,
      this.setSelectionMenuDelegate.getCurrentSetName(),
      this.setSelectionMenuDelegate.getCurrentFlagIcon(),
      (): void => {
        this.setSelectionMenuDelegate.showActiveSetsForSetSelection();
      },
      null,
      null,
    ),
  );

  private screenDelegate = this.screenFactory.createScreenDelegate();

  public componentDidMount(): void {
    this.setSelectionMenuDelegate.autoUpdateSubtitleOnSetChange(
      this.observableScreen,
    );
  }

  protected onThemeChanged(theme: Theme): void {
    this.navigatorDelegate.mergeOptions(
      theme === Theme.LIGHT
        ? LearnScreenStyle.SCREEN_LIGHT_STYLES_ONLY
        : LearnScreenStyle.SCREEN_DARK_STYLES_ONLY,
    );
  }

  public render(): React.ReactElement<any> {
    return (
      <PlayScreen
        setStore={this.props.rootStore.setStore}
        themeStore={this.props.rootStore.themeStore}
        screenDelegate={this.screenDelegate}
      />
    );
  }
}
